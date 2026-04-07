import type { SupportedMediaType } from './receipt.js';

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface ProviderContentBlock {
  type: 'text' | 'image';
  text?: string;
  imageData?: {
    base64: string;
    mediaType: SupportedMediaType;
  };
  imageUrl?: string;
}

export interface ProviderMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | ProviderContentBlock[];
}

export interface ProviderRequest {
  model: string;
  systemPrompt: string;
  messages: ProviderMessage[];
  maxTokens: number;
  temperature: number;
  signal?: AbortSignal;
}

export interface ProviderResponse {
  text: string;
  usage?: TokenUsage;
  model: string;
}

export interface ScannerProvider {
  readonly name: string;
  readonly defaultModel: string;
  complete(request: ProviderRequest): Promise<ProviderResponse>;
  stream(request: ProviderRequest): AsyncGenerator<string>;
}
