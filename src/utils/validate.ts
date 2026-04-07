import { z } from 'zod';
import { ValidationError } from '../types/errors.js';
import type { ReceiptData } from '../types/receipt.js';

const MerchantSchema = z.object({
  name: z.string().nullable().default(null),
  address: z.string().nullable().default(null),
  city: z.string().nullable().default(null),
  state: z.string().nullable().default(null),
  postalCode: z.string().nullable().default(null),
  country: z.string().nullable().default(null),
  phone: z.string().nullable().default(null),
  website: z.string().nullable().default(null),
  taxId: z.string().nullable().default(null),
});

export const LineItemSchema = z.object({
  description: z.string(),
  quantity: z.number().nullable().default(null),
  unitPrice: z.number().nullable().default(null),
  totalPrice: z.number(),
  sku: z.string().nullable().default(null),
  category: z.string().nullable().default(null),
  discountAmount: z.number().nullable().default(null),
  isVoided: z.boolean().default(false),
});

const TaxEntrySchema = z.object({
  label: z.string(),
  rate: z.number().nullable().default(null),
  amount: z.number(),
});

const PaymentInfoSchema = z.object({
  method: z
    .enum(['cash', 'card', 'digital_wallet', 'check', 'other'])
    .nullable()
    .default(null),
  cardBrand: z.string().nullable().default(null),
  cardLastFour: z.string().nullable().default(null),
  transactionId: z.string().nullable().default(null),
  authCode: z.string().nullable().default(null),
  tip: z.number().nullable().default(null),
  cashGiven: z.number().nullable().default(null),
  changeGiven: z.number().nullable().default(null),
});

export const ReceiptSchema = z.object({
  merchant: MerchantSchema.default(() => ({ name: null, address: null, city: null, state: null, postalCode: null, country: null, phone: null, website: null, taxId: null })),
  date: z.string().nullable().default(null),
  time: z.string().nullable().default(null),
  timezone: z.string().nullable().default(null),
  receiptNumber: z.string().nullable().default(null),
  orderNumber: z.string().nullable().default(null),
  tableNumber: z.string().nullable().default(null),
  invoiceNumber: z.string().nullable().default(null),
  items: z.array(LineItemSchema).default([]),
  subtotal: z.number().nullable().default(null),
  discountTotal: z.number().nullable().default(null),
  taxes: z.array(TaxEntrySchema).default([]),
  serviceCharge: z.number().nullable().default(null),
  deliveryFee: z.number().nullable().default(null),
  tip: z.number().nullable().default(null),
  total: z.number().default(0),
  currency: z.string().nullable().default(null),
  payment: PaymentInfoSchema.default(() => ({ method: null, cardBrand: null, cardLastFour: null, transactionId: null, authCode: null, tip: null, cashGiven: null, changeGiven: null })),
  cashier: z.string().nullable().default(null),
  confidence: z.number().min(0).max(1).default(0),
  rawText: z.string().nullable().default(null),
  warnings: z.array(z.string()).default([]),
});

export function validateReceiptData(raw: unknown): ReceiptData {
  const result = ReceiptSchema.safeParse(raw);
  if (!result.success) {
    throw new ValidationError(raw, result.error.issues);
  }
  return result.data as ReceiptData;
}

export function validateReceiptDataSoft(raw: unknown): Partial<ReceiptData> {
  const result = ReceiptSchema.safeParse(raw);
  if (result.success) {
    return result.data as ReceiptData;
  }
  // Return whatever partial data we can recover
  const partial = ReceiptSchema.partial().safeParse(raw);
  return (partial.success ? partial.data : {}) as Partial<ReceiptData>;
}
