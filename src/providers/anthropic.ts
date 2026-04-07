import Anthropic from '@anthropic-ai/sdk';
import { ProviderError } from '../types/errors.js';
import type { ProviderRequest, ProviderResponse, ScannerProvider, TokenUsage } from '../types/provider.js';
import { BaseProvider } from './base.js';

export interface AnthropicProviderConfig {
  apiKey: string;
  defaultModel?: string;
  baseURL?: string;
}

class AnthropicProvider extends BaseProvider {
  readonly name = 'anthropic';
  readonly defaultModel: string;
  private client: Anthropic;

  constructor(config: AnthropicProviderConfig) {
    super();
    this.defaultModel = config.defaultModel ?? 'claude-opus-4-5';
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });
  }

  private buildContent(request: ProviderRequest) {
    const content: unknown[] = [];

    for (const msg of request.messages) {
      if (typeof msg.content === 'string') continue;
      for (const block of msg.content) {
        if (block.type === 'image') {
          if (block.imageData) {
            content.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: block.imageData.mediaType,
                data: block.imageData.base64,
              },
            });
          } else if (block.imageUrl) {
            content.push({
              type: 'image',
              source: { type: 'url', url: block.imageUrl },
            });
          }
        } else if (block.type === 'text' && block.text) {
          content.push({ type: 'text', text: block.text });
        }
      }
    }

    return content;
  }

  async complete(request: ProviderRequest): Promise<ProviderResponse> {
    try {
      const response = await (this.client.messages.create as Function)({
        model: request.model,
        system: request.systemPrompt,
        messages: [{ role: 'user', content: this.buildContent(request) }],
        max_tokens: request.maxTokens,
      });

      const text: string =
        response.content
          ?.filter((b: { type: string }) => b.type === 'text')
          .map((b: { type: string; text: string }) => b.text)
          .join('') ?? '';

      const usage: TokenUsage | undefined = response.usage
        ? {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
            totalTokens: response.usage.input_tokens + response.usage.output_tokens,
          }
        : undefined;

      return {
        text,
        model: response.model ?? request.model,
        ...(usage ? { usage } : {}),
      };
    } catch (cause) {
      throw new ProviderError(this.name, cause);
    }
  }

  async *stream(request: ProviderRequest): AsyncGenerator<string> {
    try {
      const stream = (this.client.messages.stream as Function)({
        model: request.model,
        system: request.systemPrompt,
        messages: [{ role: 'user', content: this.buildContent(request) }],
        max_tokens: request.maxTokens,
      });

      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta?.type === 'text_delta'
        ) {
          yield event.delta.text as string;
        }
      }
    } catch (cause) {
      throw new ProviderError(this.name, cause);
    }
  }
}

export function createAnthropicProvider(config: AnthropicProviderConfig): ScannerProvider {
  return new AnthropicProvider(config);
}
