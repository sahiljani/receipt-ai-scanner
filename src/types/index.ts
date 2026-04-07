export type {
  SupportedMediaType,
  ImageInput,
  Merchant,
  LineItem,
  TaxEntry,
  PaymentInfo,
  ReceiptData,
} from './receipt.js';

export type {
  TokenUsage,
  ProviderContentBlock,
  ProviderMessage,
  ProviderRequest,
  ProviderResponse,
  ScannerProvider,
} from './provider.js';

export type {
  ScannerConfig,
  ScanOptions,
  ScanResult,
  StreamChunk,
} from './options.js';

export {
  ReceiptScannerError,
  ProviderError,
  ParseError,
  ValidationError,
  ImageInputError,
  TimeoutError,
} from './errors.js';
