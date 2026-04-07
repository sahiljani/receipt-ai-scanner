import type { ScannerProvider } from '../types/provider.js';
import { createOpenAIProvider } from './openai.js';

export interface OpenAICompatibleProviderConfig {
  baseURL: string;
  apiKey: string;
  defaultModel: string;
  name?: string;
}

export function createOpenAICompatibleProvider(
  config: OpenAICompatibleProviderConfig,
): ScannerProvider {
  const provider = createOpenAIProvider({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    defaultModel: config.defaultModel,
  }) as { name: string } & ScannerProvider;

  // Override the name for display purposes
  if (config.name) {
    (provider as { name: string }).name = config.name;
  }

  return provider;
}
