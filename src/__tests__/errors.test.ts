import { describe, it, expect } from 'vitest';
import {
  ReceiptScannerError,
  ProviderError,
  ParseError,
  ValidationError,
  ImageInputError,
  TimeoutError,
} from '../types/errors.js';

describe('Error classes', () => {
  it('ReceiptScannerError sets name and message', () => {
    const err = new ReceiptScannerError('base error');
    expect(err.name).toBe('ReceiptScannerError');
    expect(err.message).toBe('base error');
    expect(err).toBeInstanceOf(Error);
  });

  it('ProviderError includes provider name in message', () => {
    const cause = new Error('rate limited');
    const err = new ProviderError('openai', cause);
    expect(err.name).toBe('ProviderError');
    expect(err.providerName).toBe('openai');
    expect(err.message).toContain('openai');
    expect(err.message).toContain('rate limited');
    expect(err).toBeInstanceOf(ReceiptScannerError);
  });

  it('ParseError stores rawText', () => {
    const err = new ParseError('not-json', new SyntaxError('bad'));
    expect(err.name).toBe('ParseError');
    expect(err.rawText).toBe('not-json');
    expect(err.message).toContain('bad');
    expect(err).toBeInstanceOf(ReceiptScannerError);
  });

  it('ValidationError stores issues array', () => {
    const issues = [{ message: 'required', path: ['total'], code: 'invalid_type' as const, expected: 'number', received: 'string' }];
    const err = new ValidationError({ total: 'bad' }, issues as any);
    expect(err.name).toBe('ValidationError');
    expect(err.issues).toEqual(issues);
    expect(err.message).toContain('required');
    expect(err).toBeInstanceOf(ReceiptScannerError);
  });

  it('ImageInputError sets name', () => {
    const err = new ImageInputError('file not found');
    expect(err.name).toBe('ImageInputError');
    expect(err.message).toBe('file not found');
    expect(err).toBeInstanceOf(ReceiptScannerError);
  });

  it('TimeoutError includes duration in message', () => {
    const err = new TimeoutError(5000);
    expect(err.name).toBe('TimeoutError');
    expect(err.message).toContain('5000');
    expect(err).toBeInstanceOf(ReceiptScannerError);
  });

  it('all errors are instanceof ReceiptScannerError', () => {
    const errors = [
      new ProviderError('x', new Error()),
      new ParseError('x', new Error()),
      new ValidationError({}, []),
      new ImageInputError('x'),
      new TimeoutError(1000),
    ];
    for (const err of errors) {
      expect(err).toBeInstanceOf(ReceiptScannerError);
    }
  });
});
