import { describe, it, expect } from 'vitest';
import { validateReceiptData, validateReceiptDataSoft, LineItemSchema, ReceiptSchema } from '../utils/validate.js';
import { ValidationError } from '../types/errors.js';

const validReceipt = {
  merchant: { name: 'Walmart', address: '123 Main St', city: 'Toronto', state: 'ON', postalCode: 'M5V1A1', country: 'Canada', phone: null, website: null, taxId: null },
  receiptType: 'retail' as const,
  date: '2024-11-15',
  time: '14:32:00',
  timezone: 'America/Toronto',
  receiptNumber: '00123',
  orderNumber: null,
  tableNumber: null,
  invoiceNumber: null,
  items: [
    { description: 'Coca-Cola', quantity: 2, unitPrice: 1.99, totalPrice: 3.98, sku: '067000004270', category: 'beverages', discountAmount: null, isVoided: false, barcode: null, brand: 'Coca-Cola', discountLabel: null, notes: null, productType: 'beverages' },
  ],
  subtotal: 3.98,
  discountTotal: null,
  taxes: [{ label: 'HST', rate: 0.13, amount: 0.52 }],
  serviceCharge: null,
  deliveryFee: null,
  tip: null,
  total: 4.50,
  currency: 'CAD',
  payment: { method: 'card' as const, cardBrand: 'Visa', cardLastFour: '4242', transactionId: null, authCode: null, tip: null, cashGiven: null, changeGiven: null },
  cashier: 'Jane',
  confidence: 0.95,
  rawText: null,
  warnings: [],
};

describe('validateReceiptData', () => {
  it('accepts a fully valid receipt', () => {
    const result = validateReceiptData(validReceipt);
    expect(result.merchant.name).toBe('Walmart');
    expect(result.total).toBe(4.50);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.productType).toBe('beverages');
    expect(result.receiptType).toBe('retail');
  });

  it('throws ValidationError for invalid total type', () => {
    expect(() => validateReceiptData({ ...validReceipt, total: 'bad' }))
      .toThrow(ValidationError);
  });

  it('throws ValidationError for confidence out of range', () => {
    expect(() => validateReceiptData({ ...validReceipt, confidence: 1.5 }))
      .toThrow(ValidationError);
    expect(() => validateReceiptData({ ...validReceipt, confidence: -0.1 }))
      .toThrow(ValidationError);
  });

  it('throws ValidationError for invalid payment method', () => {
    expect(() => validateReceiptData({ ...validReceipt, payment: { ...validReceipt.payment, method: 'bitcoin' } }))
      .toThrow(ValidationError);
  });

  it('throws ValidationError for invalid receiptType', () => {
    expect(() => validateReceiptData({ ...validReceipt, receiptType: 'supermarket' }))
      .toThrow(ValidationError);
  });
});

describe('validateReceiptDataSoft', () => {
  it('returns data for valid input', () => {
    const result = validateReceiptDataSoft(validReceipt);
    expect(result.total).toBe(4.50);
  });

  it('returns partial data instead of throwing on invalid input', () => {
    const result = validateReceiptDataSoft({ total: 'bad', items: [], taxes: [], payment: {}, merchant: {}, confidence: 0.5, warnings: [] });
    expect(result).toBeDefined();
  });
});

describe('LineItemSchema', () => {
  it('defaults all nullable fields to null', () => {
    const result = LineItemSchema.parse({ description: 'Coffee', totalPrice: 2.49 });
    expect(result.quantity).toBeNull();
    expect(result.unitPrice).toBeNull();
    expect(result.sku).toBeNull();
    expect(result.category).toBeNull();
    expect(result.discountAmount).toBeNull();
    expect(result.barcode).toBeNull();
    expect(result.brand).toBeNull();
    expect(result.discountLabel).toBeNull();
    expect(result.notes).toBeNull();
    expect(result.productType).toBeNull();
    expect(result.isVoided).toBe(false);
  });

  it('accepts all v1.1.0 fields', () => {
    const item = {
      description: 'Pampers',
      quantity: 1,
      unitPrice: 24.99,
      totalPrice: 24.99,
      sku: '003700086358',
      barcode: '0037000863588',
      category: 'baby',
      brand: 'Pampers',
      discountAmount: 5.00,
      discountLabel: '20% OFF',
      notes: null,
      productType: 'baby',
      isVoided: false,
    };
    const result = LineItemSchema.parse(item);
    expect(result.brand).toBe('Pampers');
    expect(result.barcode).toBe('0037000863588');
    expect(result.discountLabel).toBe('20% OFF');
    expect(result.productType).toBe('baby');
  });

  it('marks isVoided false by default', () => {
    const result = LineItemSchema.parse({ description: 'Item', totalPrice: 1.00 });
    expect(result.isVoided).toBe(false);
  });
});

describe('ReceiptSchema', () => {
  it('defaults receiptType to null', () => {
    const result = ReceiptSchema.parse({ total: 0, items: [], taxes: [], payment: {}, merchant: {}, confidence: 0, warnings: [] });
    expect(result.receiptType).toBeNull();
  });

  it('accepts valid receiptType values', () => {
    const types = ['grocery', 'restaurant', 'fuel', 'pharmacy', 'retail', 'other'] as const;
    for (const t of types) {
      const result = ReceiptSchema.parse({ total: 0, receiptType: t, items: [], taxes: [], payment: {}, merchant: {}, confidence: 0, warnings: [] });
      expect(result.receiptType).toBe(t);
    }
  });
});
