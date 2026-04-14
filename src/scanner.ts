import { buildSystemPrompt, DEFAULT_SYSTEM_PROMPT } from './prompts/system.js';
import { TimeoutError } from './types/errors.js';
import type { ScanDetail, ScannerConfig, ScanOptions, ScanResult, StreamChunk } from './types/options.js';
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

function resolveSystemPrompt(
  configSystemPrompt: string,
  configHasCustomPrompt: boolean,
  detail: ScanDetail | undefined,
  productTypes: string[] | undefined,
): string {
  if (configHasCustomPrompt) {
    // Honour the custom prompt but still inject productType instructions if requested.
    if (productTypes && productTypes.length > 0) {
      const list = productTypes.map((t) => `"${t}"`).join(', ');
      return `${configSystemPrompt}\n\nPRODUCT TYPE CLASSIFICATION:\nFor each item, add a "productType" field set to the closest match from: [${list}]. Use null if no match.`;
    }
    return configSystemPrompt;
  }
  return buildSystemPrompt(detail ?? 'standard', productTypes);
}

function enforceProductTypes(items: import('./types/receipt.js').ReceiptData['items'], productTypes: string[]): import('./types/receipt.js').ReceiptData['items'] {
  const allowed = new Set(productTypes);
  return items.map((item) => ({
    ...item,
    productType: item.productType !== null && allowed.has(item.productType) ? item.productType : null,
  }));
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
  private hasCustomPrompt: boolean;
  private systemPromptAppend: string | undefined;
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
    this.systemPromptAppend = config.systemPromptAppend;

    if (config.systemPrompt) {
      this.hasCustomPrompt = true;
      this.systemPrompt = config.systemPrompt;
    } else if (config.systemPromptAppend) {
      this.hasCustomPrompt = true;
      this.systemPrompt = `${DEFAULT_SYSTEM_PROMPT}\n\n${config.systemPromptAppend}`;
    } else {
      this.hasCustomPrompt = false;
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
    const systemPrompt = resolveSystemPrompt(this.systemPrompt, this.hasCustomPrompt, options.detail, options.productTypes);

    try {
      const request = buildRequest(
        this.provider,
        this.configModel,
        systemPrompt,
        imageData,
        this.maxTokens,
        this.temperature,
        options,
        signal,
      );
      const response = await this.provider.complete(request);
      let data = parseReceiptFromText(response.text, this.strictValidation);
      if (options.productTypes && options.productTypes.length > 0) {
        data = { ...data, items: enforceProductTypes(data.items, options.productTypes) };
      }

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
    const systemPrompt = resolveSystemPrompt(this.systemPrompt, this.hasCustomPrompt, options.detail, options.productTypes);
    const request = buildRequest(
      this.provider,
      this.configModel,
      systemPrompt,
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

      let data = parseReceiptFromText(rawText, this.strictValidation);
      if (options.productTypes && options.productTypes.length > 0) {
        data = { ...data, items: enforceProductTypes(data.items, options.productTypes) };
      }
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
    const systemPrompt = resolveSystemPrompt(this.systemPrompt, this.hasCustomPrompt, options.detail, options.productTypes);
    const request = buildRequest(
      this.provider,
      this.configModel,
      systemPrompt,
      imageData,
      this.maxTokens,
      this.temperature,
      options,
    );
    const response = await this.provider.complete(request);
    return response.text;
  }
}
