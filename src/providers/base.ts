import type { ProviderContentBlock, ProviderMessage, ProviderRequest, ProviderResponse, ScannerProvider } from '../types/provider.js';
import type { SupportedMediaType } from '../types/receipt.js';

export abstract class BaseProvider implements ScannerProvider {
  abstract readonly name: string;
  abstract readonly defaultModel: string;
  abstract complete(request: ProviderRequest): Promise<ProviderResponse>;
  abstract stream(request: ProviderRequest): AsyncGenerator<string>;

  protected buildUserMessage(
    imageData: { base64: string; mediaType: SupportedMediaType } | { url: string },
    userPrompt?: string,
  ): ProviderMessage {
    const imageBlock: ProviderContentBlock =
      'base64' in imageData
        ? { type: 'image', imageData: { base64: imageData.base64, mediaType: imageData.mediaType } }
        : { type: 'image', imageUrl: imageData.url };

    const content: ProviderContentBlock[] = [imageBlock];

    if (userPrompt) {
      content.push({ type: 'text', text: userPrompt });
    }

    return { role: 'user', content };
  }
}
