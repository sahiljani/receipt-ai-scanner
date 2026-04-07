import { DEFAULT_SYSTEM_PROMPT } from './prompts/system.js';
import { TimeoutError } from './types/errors.js';
import type { ScannerConfig, ScanOptions, ScanResult, StreamChunk } from './types/options.js';
import type { ProviderContentBlock, ProviderMessage, ProviderRequest, ScannerProvider } from './types/provider.js';
import type { ImageInput, SupportedMediaType } from './types/receipt.js';
import { resolveImageInput } from './utils/image.js';
import { parseReceiptFromText } from './utils/parse.js';

function buildUserMessage(
  imageData: { base64: string; mediaType: SupportedMediaType } | { url: string },
  userPrompt?: string,
): ProviderMessage {
  const imageBlock: ProviderContentBlock =
    'base64' in imageData
      ? { type: 'image', imageData: { base64: imageData.base64, mediaType: imageData.mediaType } }
      : { type: 'image', imageUrl: imageData.url };

  const content: ProviderContentBlock[] = [imageBlock];
  content.push({ type: 'text', text: userPrompt ?? 'Extract all receipt data from this image and return it as JSON.' });
  return { role: 'user', content };
}

function buildRequest(
  provider: ScannerProvider,
  configModel: string | undefined,
  systemPrompt: string,
  imageData: { base64: string; mediaType: SupportedMediaType } | { url: string },
  maxTokens: number,
  temperature: number,
  options: ScanOptions,
  signal?: AbortSignal,
): ProviderRequest {
  const req: ProviderRequest = {
    model: options.model ?? configModel ?? provider.defaultModel,
    systemPrompt,
    messages: [buildUserMessage(imageData, options.userPrompt)],
    maxTokens: options.maxTokens ?? maxTokens,
    temperature: options.temperature ?? temperature,
  };
  const resolvedSignal = signal ?? options.signal;
  if (resolvedSignal) req.signal = resolvedSignal;
  return req;
}

export class ReceiptScanner {
  private provider: ScannerProvider;
  private configModel: string | undefined;
  private systemPrompt: string;
  private maxTokens: number;
  private temperature: number;
  private strictValidation: boolean;
  private timeoutMs: number;

  constructor(config: ScannerConfig) {
    this.provider = config.provider;
    this.configModel = config.model;
    this.maxTokens = config.maxTokens ?? 2048;
    this.temperature = config.temperature ?? 0;
    this.strictValidation = config.strictValidation ?? false;
    this.timeoutMs = config.timeoutMs ?? 0;

    if (config.systemPrompt) {
      this.systemPrompt = config.systemPrompt;
    } else if (config.systemPromptAppend) {
      this.systemPrompt = `${DEFAULT_SYSTEM_PROMPT}\n\n${config.systemPromptAppend}`;
    } else {
      this.systemPrompt = DEFAULT_SYSTEM_PROMPT;
    }
  }

  setProvider(provider: ScannerProvider): void {
    this.provider = provider;
  }

  private withTimeout(signal: AbortSignal | undefined): {
    signal: AbortSignal | undefined;
    cleanup: () => void;
  } {
    if (!signal && this.timeoutMs > 0) {
      const controller = new AbortController();
      const id = setTimeout(
        () => controller.abort(new TimeoutError(this.timeoutMs)),
        this.timeoutMs,
      );
      return { signal: controller.signal, cleanup: () => clearTimeout(id) };
    }
    return { signal, cleanup: () => undefined };
  }

  async scan(input: ImageInput, options: ScanOptions = {}): Promise<ScanResult> {
    const start = Date.now();
    const imageData = await resolveImageInput(input);
    const { signal, cleanup } = this.withTimeout(options.signal);

    try {
      const request = buildRequest(
        this.provider,
        this.configModel,
        this.systemPrompt,
        imageData,
        this.maxTokens,
        this.temperature,
        options,
        signal,
      );
      const response = await this.provider.complete(request);
      const data = parseReceiptFromText(response.text, this.strictValidation);

      const result: ScanResult = {
        data,
        rawResponse: response.text,
        provider: this.provider.name,
        model: response.model,
        durationMs: Date.now() - start,
      };
      if (response.usage) result.usage = response.usage;
      return result;
    } finally {
      cleanup();
    }
  }

  async *scanStream(
    input: ImageInput,
    options: ScanOptions = {},
  ): AsyncGenerator<StreamChunk> {
    const start = Date.now();
    const imageData = await resolveImageInput(input);
    const request = buildRequest(
      this.provider,
      this.configModel,
      this.systemPrompt,
      imageData,
      this.maxTokens,
      this.temperature,
      options,
    );

    let rawText = '';

    try {
      for await (const delta of this.provider.stream(request)) {
        rawText += delta;
        yield { type: 'delta', delta };
      }

      const data = parseReceiptFromText(rawText, this.strictValidation);
      const result: ScanResult = {
        data,
        rawResponse: rawText,
        provider: this.provider.name,
        model: request.model,
        durationMs: Date.now() - start,
      };
      yield { type: 'done', result };
    } catch (error) {
      yield {
        type: 'error',
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  async scanRaw(input: ImageInput, options: ScanOptions = {}): Promise<string> {
    const imageData = await resolveImageInput(input);
    const request = buildRequest(
      this.provider,
      this.configModel,
      this.systemPrompt,
      imageData,
      this.maxTokens,
      this.temperature,
      options,
    );
    const response = await this.provider.complete(request);
    return response.text;
  }
}
