import type { ZodIssue } from 'zod';

export class ReceiptScannerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReceiptScannerError';
  }
}

export class ProviderError extends ReceiptScannerError {
  constructor(
    public readonly providerName: string,
    public readonly cause: unknown,
  ) {
    const msg =
      cause instanceof Error ? cause.message : String(cause);
    super(`Provider "${providerName}" error: ${msg}`);
    this.name = 'ProviderError';
  }
}

export class ParseError extends ReceiptScannerError {
  constructor(
    public readonly rawText: string,
    public readonly cause: unknown,
  ) {
    const msg =
      cause instanceof Error ? cause.message : String(cause);
    super(`Failed to parse receipt JSON: ${msg}`);
    this.name = 'ParseError';
  }
}

export class ValidationError extends ReceiptScannerError {
  constructor(
    public readonly partial: unknown,
    public readonly issues: ZodIssue[],
  ) {
    super(`Receipt validation failed: ${issues.map((i) => i.message).join(', ')}`);
    this.name = 'ValidationError';
  }
}

export class ImageInputError extends ReceiptScannerError {
  constructor(message: string) {
    super(message);
    this.name = 'ImageInputError';
  }
}

export class TimeoutError extends ReceiptScannerError {
  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}
