import { describe, it, expect } from 'vitest';
import { extractJsonFromText, parseReceiptFromText } from '../utils/parse.js';
import { ParseError } from '../types/errors.js';

describe('extractJsonFromText', () => {
  it('returns bare JSON unchanged', () => {
    const input = '{"total":9.99}';
    expect(extractJsonFromText(input)).toBe(input);
  });

  it('strips ```json fences', () => {
    const input = '```json\n{"total":9.99}\n```';
    expect(extractJsonFromText(input)).toBe('{"total":9.99}');
  });

  it('strips plain ``` fences', () => {
    const input = '```\n{"total":9.99}\n```';
    expect(extractJsonFromText(input)).toBe('{"total":9.99}');
  });

  it('extracts JSON from surrounding prose', () => {
    const input = 'Here is the result:\n{"total":9.99}\nHope that helps!';
    expect(extractJsonFromText(input)).toBe('{"total":9.99}');
  });

  it('returns trimmed text when no JSON object is found', () => {
    expect(extractJsonFromText('  no json here  ')).toBe('no json here');
  });
});

describe('parseReceiptFromText — soft mode', () => {
  const minimalValidJson = JSON.stringify({
    merchant: { name: 'Tim Hortons', address: null, city: null, state: null, postalCode: null, country: null, phone: null, website: null, taxId: null },
    receiptType: 'restaurant',
    date: '2024-11-15',
    time: '14:32:00',
    timezone: null,
    receiptNumber: null,
    orderNumber: null,
    tableNumber: null,
    invoiceNumber: null,
    items: [
      { description: 'Medium Coffee', quantity: 1, unitPrice: 2.49, totalPrice: 2.49, sku: null, category: null, discountAmount: null, isVoided: false, barcode: null, brand: null, discountLabel: null, notes: null, productType: 'beverages' },
    ],
    subtotal: 2.49,
    discountTotal: null,
    taxes: [{ label: 'HST', rate: 0.13, amount: 0.32 }],
    serviceCharge: null,
    deliveryFee: null,
    tip: null,
    total: 2.81,
    currency: 'CAD',
    payment: { method: 'card', cardBrand: 'Visa', cardLastFour: '4242', transactionId: null, authCode: null, tip: null, cashGiven: null, changeGiven: null },
    cashier: null,
    confidence: 0.95,
    rawText: null,
    warnings: [],
  });

  it('parses a complete valid receipt', () => {
    const result = parseReceiptFromText(minimalValidJson, false);
    expect(result.merchant.name).toBe('Tim Hortons');
    expect(result.total).toBe(2.81);
    expect(result.currency).toBe('CAD');
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.description).toBe('Medium Coffee');
    expect(result.items[0]!.productType).toBe('beverages');
    expect(result.receiptType).toBe('restaurant');
  });

  it('applies safe defaults for missing optional fields', () => {
    const sparse = JSON.stringify({ total: 5.00, items: [], taxes: [], payment: {}, merchant: {}, confidence: 0.5, warnings: [] });
    const result = parseReceiptFromText(sparse, false);
    expect(result.date).toBeNull();
    expect(result.currency).toBeNull();
    expect(result.cashier).toBeNull();
    expect(result.receiptType).toBeNull();
  });

  it('strips markdown fences before parsing', () => {
    const fenced = '```json\n' + minimalValidJson + '\n```';
    const result = parseReceiptFromText(fenced, false);
    expect(result.total).toBe(2.81);
  });

  it('throws ParseError on non-JSON input', () => {
    expect(() => parseReceiptFromText('not json at all', false))
      .toThrow(ParseError);
  });

  it('defaults confidence to 0 when missing', () => {
    const noConf = JSON.stringify({ total: 1, items: [], taxes: [], payment: {}, merchant: {}, warnings: [] });
    const result = parseReceiptFromText(noConf, false);
    expect(result.confidence).toBe(0);
  });

  it('defaults items to empty array when missing', () => {
    const noItems = JSON.stringify({ total: 1, taxes: [], payment: {}, merchant: {}, confidence: 0.8, warnings: [] });
    const result = parseReceiptFromText(noItems, false);
    expect(result.items).toEqual([]);
  });
});

describe('parseReceiptFromText — strict mode', () => {
  it('throws on invalid data in strict mode', () => {
    const bad = JSON.stringify({ total: 'not-a-number', items: [], taxes: [], payment: {}, merchant: {}, confidence: 0.5, warnings: [] });
    expect(() => parseReceiptFromText(bad, true)).toThrow();
  });
});
