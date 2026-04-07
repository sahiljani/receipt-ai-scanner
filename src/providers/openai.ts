import OpenAI from 'openai';
import { ProviderError } from '../types/errors.js';
import type { ProviderRequest, ProviderResponse, ScannerProvider, TokenUsage } from '../types/provider.js';
import { BaseProvider } from './base.js';

export interface OpenAIProviderConfig {
  apiKey: string;
  organization?: string;
  baseURL?: string;
  defaultModel?: string;
}

class OpenAIProvider extends BaseProvider {
  readonly name: string;
  readonly defaultModel: string;
  private client: OpenAI;

  constructor(config: OpenAIProviderConfig, name = 'openai') {
    super();
    this.name = name;
    this.defaultModel = config.defaultModel ?? 'gpt-4o';
    this.client = new OpenAI({
      apiKey: config.apiKey,
      organization: config.organization,
      baseURL: config.baseURL,
    });
  }

  private buildMessages(request: ProviderRequest) {
    type Msg = { role: string; content: unknown };
    const messages: Msg[] = [];

    for (const msg of request.messages) {
      if (typeof msg.content === 'string') {
        messages.push({ role: msg.role, content: msg.content });
        continue;
      }

      const parts: unknown[] = [];
      for (const block of msg.content) {
        if (block.type === 'text') {
          parts.push({ type: 'text', text: block.text ?? '' });
        } else if (block.type === 'image') {
          if (block.imageData) {
            parts.push({
              type: 'image_url',
              image_url: {
                url: `data:${block.imageData.mediaType};base64,${block.imageData.base64}`,
              },
            });
          } else if (block.imageUrl) {
            parts.push({ type: 'image_url', image_url: { url: block.imageUrl } });
          }
        }
      }
      messages.push({ role: msg.role, content: parts });
    }

    return messages;
  }

  async complete(request: ProviderRequest): Promise<ProviderResponse> {
    try {
      const response = await (this.client.chat.completions.create as Function)(
        {
          model: request.model,
          messages: [
            { role: 'system', content: request.systemPrompt },
            ...this.buildMessages(request),
          ],
          max_tokens: request.maxTokens,
          temperature: request.temperature,
        },
        { signal: request.signal },
      );

      const text: string = response.choices?.[0]?.message?.content ?? '';
      const usage: TokenUsage | undefined = response.usage
        ? {
            inputTokens: response.usage.prompt_tokens,
            outputTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
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
      const stream = await (this.client.chat.completions.create as Function)(
        {
          model: request.model,
          messages: [
            { role: 'system', content: request.systemPrompt },
            ...this.buildMessages(request),
          ],
          max_tokens: request.maxTokens,
          temperature: request.temperature,
          stream: true,
        },
        { signal: request.signal },
      );

      for await (const chunk of stream) {
        const delta: string = chunk.choices?.[0]?.delta?.content ?? '';
        if (delta) yield delta;
      }
    } catch (cause) {
      throw new ProviderError(this.name, cause);
    }
  }
}

export function createOpenAIProvider(config: OpenAIProviderConfig): ScannerProvider {
  return new OpenAIProvider(config);
}
