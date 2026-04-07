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

export interface ScanOptions {
  userPrompt?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
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
