import type { ScannerProvider, TokenUsage } from './provider.js';
import type { ReceiptData } from './receipt.js';

export interface ScannerConfig {
  provider: ScannerProvider;
  model?: string;
  systemPrompt?: string;
  systemPromptAppend?: string;
  maxTokens?: number;
  temperature?: number;
  strictValidation?: boolean;
  timeoutMs?: number;
}

export type ScanDetail = 'minimal' | 'standard' | 'full';

export interface ScanOptions {
  userPrompt?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
  detail?: ScanDetail;
  /**
   * Optional list of product type labels to classify each line item against.
   *
   * - **Provided** — each item's `productType` is set to the closest match from
   *   this list, or `null` if none match. Values outside the list are rejected.
   * - **Omitted** — the LLM classifies each item freely using its own knowledge
   *   (e.g. "beverages", "dairy", "electronics"). No extra API call is made.
   *
   * @example ['beverages', 'food', 'dairy', 'bakery', 'household', 'personal-care']
   */
  productTypes?: string[];
}

export interface ScanResult {
  data: ReceiptData;
  rawResponse: string;
  usage?: TokenUsage;
  provider: string;
  model: string;
  durationMs: number;
}

export interface StreamChunk {
  type: 'delta' | 'done' | 'error';
  delta?: string;
  result?: ScanResult;
  error?: Error;
}
