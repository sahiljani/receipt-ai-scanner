export { ReceiptScanner } from './scanner.js';

export { createOpenAIProvider } from './providers/openai.js';
export type { OpenAIProviderConfig } from './providers/openai.js';

export { createAnthropicProvider } from './providers/anthropic.js';
export type { AnthropicProviderConfig } from './providers/anthropic.js';

export { createOpenAICompatibleProvider } from './providers/openai-compatible.js';
export type { OpenAICompatibleProviderConfig } from './providers/openai-compatible.js';

export { ReceiptSchema, LineItemSchema } from './utils/validate.js';
export { validateReceiptData, validateReceiptDataSoft } from './utils/validate.js';

export { DEFAULT_SYSTEM_PROMPT, buildSystemPrompt } from './prompts/system.js';

export type {
  ReceiptData,
  LineItem,
  TaxEntry,
  PaymentInfo,
  Merchant,
  ImageInput,
  SupportedMediaType,
  ReceiptType,
} from './types/receipt.js';

export type {
  ScannerConfig,
  ScanOptions,
  ScanResult,
  StreamChunk,
  ScanDetail,
} from './types/options.js';

export type { ScannerProvider, TokenUsage } from './types/provider.js';

export {
  ReceiptScannerError,
  ProviderError,
  ParseError,
  ValidationError,
  ImageInputError,
  TimeoutError,
} from './types/errors.js';
