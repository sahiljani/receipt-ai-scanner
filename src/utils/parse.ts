import { ParseError } from '../types/errors.js';
import type { ReceiptData } from '../types/receipt.js';
import { validateReceiptData, validateReceiptDataSoft } from './validate.js';

/**
 * Strips markdown code fences and extracts the first JSON object from text.
 * Guards against models that wrap output in ```json ... ``` despite instructions.
 */
export function extractJsonFromText(text: string): string {
  // Strip ```json ... ``` or ``` ... ``` fences
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch?.[1]) {
    return fenceMatch[1].trim();
  }

  // Find the first { and last } to extract bare JSON object
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    return text.slice(start, end + 1);
  }

  return text.trim();
}

export function parseReceiptFromText(text: string, strict: boolean): ReceiptData {
  const jsonStr = extractJsonFromText(text);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (cause) {
    throw new ParseError(text, cause);
  }

  if (strict) {
    return validateReceiptData(parsed);
  }

  const soft = validateReceiptDataSoft(parsed);
  // Ensure required fields have safe defaults
  return {
    merchant: soft.merchant ?? { name: null, address: null, city: null, state: null, postalCode: null, country: null, phone: null, website: null, taxId: null },
    receiptType: soft.receiptType ?? null,
    date: soft.date ?? null,
    time: soft.time ?? null,
    timezone: soft.timezone ?? null,
    receiptNumber: soft.receiptNumber ?? null,
    orderNumber: soft.orderNumber ?? null,
    tableNumber: soft.tableNumber ?? null,
    invoiceNumber: soft.invoiceNumber ?? null,
    items: soft.items ?? [],
    subtotal: soft.subtotal ?? null,
    discountTotal: soft.discountTotal ?? null,
    taxes: soft.taxes ?? [],
    serviceCharge: soft.serviceCharge ?? null,
    deliveryFee: soft.deliveryFee ?? null,
    tip: soft.tip ?? null,
    total: soft.total ?? 0,
    currency: soft.currency ?? null,
    payment: soft.payment ?? { method: null, cardBrand: null, cardLastFour: null, transactionId: null, authCode: null, tip: null, cashGiven: null, changeGiven: null },
    cashier: soft.cashier ?? null,
    confidence: soft.confidence ?? 0,
    rawText: soft.rawText ?? null,
    warnings: soft.warnings ?? ['Partial parse — some fields may be missing'],
  };
}
