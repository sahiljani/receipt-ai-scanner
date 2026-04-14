import type { ScanDetail } from '../types/options.js';

const PREAMBLE = `
You are a receipt data extraction engine. Your sole function is to analyze receipt images
and return structured JSON. You must never add commentary, explanation, or markdown outside
the JSON block.

TASK:
Analyze the provided receipt image and extract all information into the exact JSON structure
defined below. If a field cannot be determined from the image, use null. Do not invent,
infer, or hallucinate values — only extract what is explicitly visible.

OUTPUT FORMAT:
Return a single JSON object. No markdown fences. No prose. Just the JSON object.
`.trim();

const SHARED_FIELD_NOTES = `
FIELD NOTES:
- date: ISO 8601 format "YYYY-MM-DD" — convert from any format shown on receipt
- time: 24-hour format "HH:MM:SS"
- currency: ISO 4217 three-letter code e.g. "USD", "EUR", "GBP"
- taxes[].rate: decimal fraction e.g. 0.08 for 8%, or null if not shown
- payment.method: infer from context ("VISA" → "card", "CASH" → "cash", "Apple Pay" → "digital_wallet")
- receiptType: classify the merchant — "grocery", "restaurant", "fuel", "pharmacy", "retail", or "other"
- confidence: 0.0 to 1.0 — your overall confidence in the extraction quality
- rawText: verbatim text visible on the receipt, newline-separated
- warnings: note anomalies like "total does not match sum of items"
- items[].isVoided: true if the item was voided/cancelled on the receipt
`.trim();

const SHARED_RULES = `
RULES:
1. All monetary values are plain numbers with no currency symbols.
2. The "items" array must include every line item, including voided ones (isVoided: true).
3. If multiple tax lines exist, list each separately in the "taxes" array.
4. The "confidence" field is mandatory.
5. If the image contains no receipt, return: { "merchant": {}, "receiptType": null, "items": [], "taxes": [], "payment": {}, "total": 0, "confidence": 0, "warnings": ["No receipt detected"], "rawText": null }
6. Quantities are numbers; if not shown on the receipt, use null (implies 1).
`.trim();

const MINIMAL_SCHEMA = `
JSON SCHEMA:
{
  "merchant": {
    "name": string | null
  },
  "receiptType": "grocery" | "restaurant" | "fuel" | "pharmacy" | "retail" | "other" | null,
  "date": string | null,
  "total": number,
  "currency": string | null,
  "items": [
    {
      "description": string,
      "totalPrice": number,
      "isVoided": boolean
    }
  ],
  "confidence": number,
  "rawText": string | null,
  "warnings": string[]
}
`.trim();

const STANDARD_SCHEMA = `
JSON SCHEMA:
{
  "merchant": {
    "name": string | null,
    "address": string | null,
    "city": string | null,
    "state": string | null,
    "postalCode": string | null,
    "country": string | null,
    "phone": string | null,
    "website": string | null,
    "taxId": string | null
  },
  "receiptType": "grocery" | "restaurant" | "fuel" | "pharmacy" | "retail" | "other" | null,
  "date": string | null,
  "time": string | null,
  "timezone": string | null,
  "receiptNumber": string | null,
  "orderNumber": string | null,
  "tableNumber": string | null,
  "invoiceNumber": string | null,
  "items": [
    {
      "description": string,
      "quantity": number | null,
      "unitPrice": number | null,
      "totalPrice": number,
      "sku": string | null,
      "category": string | null,
      "discountAmount": number | null,
      "isVoided": boolean
    }
  ],
  "subtotal": number | null,
  "discountTotal": number | null,
  "taxes": [
    {
      "label": string,
      "rate": number | null,
      "amount": number
    }
  ],
  "serviceCharge": number | null,
  "deliveryFee": number | null,
  "tip": number | null,
  "total": number,
  "currency": string | null,
  "payment": {
    "method": "cash" | "card" | "digital_wallet" | "check" | "other" | null,
    "cardBrand": string | null,
    "cardLastFour": string | null,
    "transactionId": string | null,
    "authCode": string | null,
    "tip": number | null,
    "cashGiven": number | null,
    "changeGiven": number | null
  },
  "cashier": string | null,
  "confidence": number,
  "rawText": string | null,
  "warnings": string[]
}
`.trim();

const FULL_SCHEMA = `
JSON SCHEMA:
{
  "merchant": {
    "name": string | null,
    "address": string | null,
    "city": string | null,
    "state": string | null,
    "postalCode": string | null,
    "country": string | null,
    "phone": string | null,
    "website": string | null,
    "taxId": string | null
  },
  "receiptType": "grocery" | "restaurant" | "fuel" | "pharmacy" | "retail" | "other" | null,
  "date": string | null,
  "time": string | null,
  "timezone": string | null,
  "receiptNumber": string | null,
  "orderNumber": string | null,
  "tableNumber": string | null,
  "invoiceNumber": string | null,
  "items": [
    {
      "description": string,
      "quantity": number | null,
      "unitPrice": number | null,
      "totalPrice": number,
      "sku": string | null,
      "barcode": string | null,
      "category": string | null,
      "brand": string | null,
      "discountAmount": number | null,
      "discountLabel": string | null,
      "notes": string | null,
      "isVoided": boolean
    }
  ],
  "subtotal": number | null,
  "discountTotal": number | null,
  "taxes": [
    {
      "label": string,
      "rate": number | null,
      "amount": number
    }
  ],
  "serviceCharge": number | null,
  "deliveryFee": number | null,
  "tip": number | null,
  "total": number,
  "currency": string | null,
  "payment": {
    "method": "cash" | "card" | "digital_wallet" | "check" | "other" | null,
    "cardBrand": string | null,
    "cardLastFour": string | null,
    "transactionId": string | null,
    "authCode": string | null,
    "tip": number | null,
    "cashGiven": number | null,
    "changeGiven": number | null
  },
  "cashier": string | null,
  "confidence": number,
  "rawText": string | null,
  "warnings": string[]
}

FULL DETAIL FIELD NOTES:
- items[].barcode: barcode or UPC printed on the receipt line, if visible
- items[].brand: brand name if distinct from the item description (e.g. "Coca-Cola" vs "Cola 600ml")
- items[].discountLabel: human-readable discount label printed on the receipt (e.g. "10% OFF", "BOGO", "LOYALTY DISCOUNT")
- items[].notes: modifiers or customisation notes (e.g. "ADD CHEESE", "NO ONION", "EXTRA SHOT")
`.trim();

function schemaForDetail(detail: ScanDetail): string {
  switch (detail) {
    case 'minimal': return MINIMAL_SCHEMA;
    case 'full': return FULL_SCHEMA;
    default: return STANDARD_SCHEMA;
  }
}

const FREE_PRODUCT_TYPE_INSTRUCTION = `PRODUCT TYPE CLASSIFICATION:
For each item in the "items" array, add a "productType" field.
Use your own knowledge to classify each item into a short, descriptive product category
(e.g. "beverages", "dairy", "bakery", "snacks", "household", "personal-care", "electronics",
"clothing", "alcohol", "health", "baby", "pet", "tobacco", "automotive", "office-supplies",
or any other appropriate category).
Use a consistent, lowercase, hyphenated label. Use null only if the item truly cannot be classified.`;

function restrictedProductTypeInstruction(productTypes: string[]): string {
  const list = productTypes.map((t) => `"${t}"`).join(', ');
  return `PRODUCT TYPE CLASSIFICATION:
For each item in the "items" array, add a "productType" field.
Set it to the closest match from this exact list: [${list}].
If no category from the list is a reasonable match, use null.
Do not invent values outside this list. The value must be a string from the list or null.`;
}

export function buildSystemPrompt(detail: ScanDetail = 'standard', productTypes?: string[]): string {
  const parts = [PREAMBLE, schemaForDetail(detail), SHARED_FIELD_NOTES];

  if (productTypes && productTypes.length > 0) {
    parts.push(restrictedProductTypeInstruction(productTypes));
  } else {
    // No list supplied — let the LLM classify freely using its own knowledge.
    parts.push(FREE_PRODUCT_TYPE_INSTRUCTION);
  }

  parts.push(SHARED_RULES);
  return parts.join('\n\n');
}

// Convenience export for callers that don't use the detail option
export const DEFAULT_SYSTEM_PROMPT = buildSystemPrompt('standard');
