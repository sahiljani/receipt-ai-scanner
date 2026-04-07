# 🧾 receipt-ai-scanner

> Extract structured data from any receipt image using vision-powered LLMs — OpenAI, Anthropic, Gemini, or any OpenAI-compatible API.

[![npm version](https://img.shields.io/npm/v/receipt-ai-scanner?color=crimson&style=flat-square)](https://www.npmjs.com/package/receipt-ai-scanner)
[![license](https://img.shields.io/npm/l/receipt-ai-scanner?style=flat-square)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-%3E%3D18-brightgreen?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Build](https://img.shields.io/badge/build-passing-brightgreen?style=flat-square)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](https://github.com/sahiljani/receipt-ai-scanner/pulls)

---

## What is this?

**receipt-ai-scanner** is a TypeScript library that takes a receipt image (file path, URL, or buffer) and returns clean, validated, fully-typed JSON — no OCR setup, no regex hacks, no brittle template matching.

It sends the image to a vision LLM with a carefully engineered extraction prompt and validates the response with [Zod](https://zod.dev) before handing it back to you.

```
Receipt Image  →  Vision LLM  →  Validated JSON
    📄                🤖               📦
```

---

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Providers](#providers)
  - [OpenAI](#openai-gpt-4o)
  - [Anthropic](#anthropic-claude)
  - [OpenAI-Compatible](#openai-compatible-gemini-together-groq-etc)
- [API Reference](#api-reference)
  - [ReceiptScanner](#receiptscanner)
  - [scan()](#scan)
  - [scanStream()](#scanstream)
  - [scanRaw()](#scanraw)
- [Receipt Data Schema](#receipt-data-schema)
- [Image Input Types](#image-input-types)
- [Error Handling](#error-handling)
- [What Gets Extracted](#what-gets-extracted)
- [Extending the Prompt](#extending-the-prompt)
- [Contributing](#contributing)
- [License](#license)

---

## Features

| | Feature |
|---|---|
| ✅ | **Any vision LLM** — OpenAI, Anthropic, Gemini, or any OpenAI-compatible endpoint |
| ✅ | **Fully typed** — complete TypeScript types for every field |
| ✅ | **Zod validated** — schema validation with strict or soft mode |
| ✅ | **Streaming support** — real-time delta chunks via `AsyncGenerator` |
| ✅ | **Smart warnings** — detects mismatched totals, item count discrepancies |
| ✅ | **Flexible input** — file path, URL (auto-fetched), `Buffer`, `Uint8Array` |
| ✅ | **Dual CJS + ESM** — works in Node.js, Bun, and bundlers |
| ✅ | **Extensible prompt** — append custom instructions without replacing defaults |
| ✅ | **Confidence score** — model self-reports extraction quality (0–1) |
| ✅ | **Raw text capture** — verbatim OCR text stored alongside structured data |

---

## Quick Start

```bash
npm install receipt-ai-scanner openai
```

```typescript
import { ReceiptScanner, createOpenAIProvider } from 'receipt-ai-scanner';

const scanner = new ReceiptScanner({
  provider: createOpenAIProvider({ apiKey: process.env.OPENAI_API_KEY }),
});

const result = await scanner.scan('./receipt.jpg');

console.log(result.data.merchant.name);  // "Tim Hortons"
console.log(result.data.total);          // 4.99
console.log(result.data.currency);       // "CAD"
console.log(result.data.items);          // [{ description: "Medium Coffee", ... }]
```

---

## Installation

```bash
# npm
npm install receipt-ai-scanner

# pnpm
pnpm add receipt-ai-scanner

# bun
bun add receipt-ai-scanner
```

Install the SDK for your chosen provider (only what you need):

```bash
npm install openai              # for OpenAI or any OpenAI-compatible API
npm install @anthropic-ai/sdk   # for Anthropic Claude
```

**Requirements:** Node.js ≥ 18

---

## Providers

### OpenAI (GPT-4o)

```typescript
import { ReceiptScanner, createOpenAIProvider } from 'receipt-ai-scanner';

const scanner = new ReceiptScanner({
  provider: createOpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY,
    defaultModel: 'gpt-4o',          // optional, default: 'gpt-4o'
    organization: 'org-...',         // optional
  }),
});
```

### Anthropic (Claude)

```typescript
import { ReceiptScanner, createAnthropicProvider } from 'receipt-ai-scanner';

const scanner = new ReceiptScanner({
  provider: createAnthropicProvider({
    apiKey: process.env.ANTHROPIC_API_KEY,
    defaultModel: 'claude-opus-4-5', // optional
  }),
});
```

### OpenAI-Compatible (Gemini, Together, Groq, etc.)

Any API that speaks the OpenAI chat completions format works:

```typescript
import { ReceiptScanner, createOpenAICompatibleProvider } from 'receipt-ai-scanner';

const scanner = new ReceiptScanner({
  provider: createOpenAICompatibleProvider({
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    apiKey: process.env.GEMINI_API_KEY,
    defaultModel: 'gemini-2.5-flash',  // required
    name: 'gemini',                    // optional display name
  }),
});
```

#### Popular Compatible Endpoints

| Provider | Base URL | Recommended Model |
|---|---|---|
| Google Gemini | `https://generativelanguage.googleapis.com/v1beta/openai` | `gemini-2.5-flash` |
| Together AI | `https://api.together.xyz/v1` | `meta-llama/Llama-Vision-Free` |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.2-11b-vision-preview` |
| Ollama (local) | `http://localhost:11434/v1` | `llava` |
| Azure OpenAI | `https://{resource}.openai.azure.com/openai/deployments/{deployment}` | `gpt-4o` |

---

## API Reference

### `ReceiptScanner`

```typescript
const scanner = new ReceiptScanner(config: ScannerConfig);
```

#### `ScannerConfig`

| Option | Type | Default | Description |
|---|---|---|---|
| `provider` | `ScannerProvider` | **required** | Provider created with `createOpenAIProvider` etc. |
| `model` | `string` | provider default | Override the model for all calls |
| `systemPrompt` | `string` | built-in prompt | Fully replace the default extraction prompt |
| `systemPromptAppend` | `string` | — | Append extra instructions to the default prompt |
| `maxTokens` | `number` | `2048` | Max tokens per request |
| `temperature` | `number` | `0` | LLM temperature (0 = deterministic) |
| `strictValidation` | `boolean` | `false` | Throw on Zod validation failure vs. return partial |
| `timeoutMs` | `number` | `0` (disabled) | Per-request timeout in milliseconds |

---

### `scan()`

Scan a receipt and return fully parsed, validated data.

```typescript
const result: ScanResult = await scanner.scan(input, options?);
```

#### Parameters

| Parameter | Type | Description |
|---|---|---|
| `input` | `ImageInput` | File path, URL, Buffer, Uint8Array, or `{ base64, mediaType }` |
| `options.userPrompt` | `string` | Extra instruction appended to the user turn |
| `options.model` | `string` | Per-call model override |
| `options.maxTokens` | `number` | Per-call token limit |
| `options.signal` | `AbortSignal` | Cancellation signal |

#### Returns: `ScanResult`

| Field | Type | Description |
|---|---|---|
| `data` | `ReceiptData` | Fully typed, Zod-validated receipt data |
| `rawResponse` | `string` | Raw JSON string returned by the LLM |
| `provider` | `string` | Name of the provider used |
| `model` | `string` | Model that processed the request |
| `durationMs` | `number` | Total time from call to result |
| `usage` | `TokenUsage?` | Input/output token counts (if provided by API) |

---

### `scanStream()`

Stream the response in real-time while still getting the final parsed result.

```typescript
for await (const chunk of scanner.scanStream('./receipt.jpg')) {
  if (chunk.type === 'delta') {
    process.stdout.write(chunk.delta ?? '');
  }

  if (chunk.type === 'done') {
    console.log(chunk.result?.data);
  }

  if (chunk.type === 'error') {
    console.error(chunk.error);
  }
}
```

#### `StreamChunk`

| `type` | Available fields | Description |
|---|---|---|
| `'delta'` | `delta: string` | Raw text fragment from the model |
| `'done'` | `result: ScanResult` | Final parsed result — emitted once at the end |
| `'error'` | `error: Error` | Something went wrong mid-stream |

---

### `scanRaw()`

Returns the raw LLM text output without parsing. Useful for debugging.

```typescript
const raw: string = await scanner.scanRaw('./receipt.jpg');
console.log(raw); // '{ "merchant": { "name": "Tim Hortons" }, ... }'
```

---

## Receipt Data Schema

Every successful scan returns a `ReceiptData` object:

### Merchant

| Field | Type | Example |
|---|---|---|
| `name` | `string \| null` | `"Walmart"` |
| `address` | `string \| null` | `"123 Main St"` |
| `city` | `string \| null` | `"Toronto"` |
| `state` | `string \| null` | `"ON"` |
| `postalCode` | `string \| null` | `"M5V 1A1"` |
| `country` | `string \| null` | `"Canada"` |
| `phone` | `string \| null` | `"416-555-0100"` |
| `website` | `string \| null` | `"walmart.ca"` |
| `taxId` | `string \| null` | `"894337898"` (GST/HST/VAT number) |

### Date & Time

| Field | Type | Example |
|---|---|---|
| `date` | `string \| null` | `"2024-11-15"` (ISO 8601) |
| `time` | `string \| null` | `"14:32:00"` (24-hour) |
| `timezone` | `string \| null` | `"America/Toronto"` |

### Identifiers

| Field | Type | Example |
|---|---|---|
| `receiptNumber` | `string \| null` | `"00123456"` |
| `orderNumber` | `string \| null` | `"239"` |
| `tableNumber` | `string \| null` | `"12"` (restaurant) |
| `invoiceNumber` | `string \| null` | `"INV-2024-001"` |

### Line Items

Each item in `items[]`:

| Field | Type | Example |
|---|---|---|
| `description` | `string` | `"Large Coffee"` |
| `quantity` | `number \| null` | `2` |
| `unitPrice` | `number \| null` | `2.49` |
| `totalPrice` | `number` | `4.98` |
| `isVoided` | `boolean` | `false` |

> `sku`, `category`, and `discountAmount` per item are **opt-in** — request them via `systemPromptAppend` to avoid unnecessary LLM overhead.

### Totals

| Field | Type | Example |
|---|---|---|
| `subtotal` | `number \| null` | `8.67` |
| `discountTotal` | `number \| null` | `1.00` |
| `taxes` | `TaxEntry[]` | `[{ label: "HST", rate: 0.13, amount: 1.13 }]` |
| `serviceCharge` | `number \| null` | `2.00` |
| `deliveryFee` | `number \| null` | `3.99` |
| `tip` | `number \| null` | `5.00` |
| `total` | `number` | `9.79` |
| `currency` | `string \| null` | `"CAD"` (ISO 4217) |

### Payment

| Field | Type | Example |
|---|---|---|
| `method` | `'cash' \| 'card' \| 'digital_wallet' \| 'check' \| 'other' \| null` | `"card"` |
| `cardBrand` | `string \| null` | `"Visa"` |
| `cardLastFour` | `string \| null` | `"4242"` |
| `transactionId` | `string \| null` | `"TXN-9918273"` |
| `authCode` | `string \| null` | `"012345"` |
| `cashGiven` | `number \| null` | `20.00` |
| `changeGiven` | `number \| null` | `10.21` |

### Metadata

| Field | Type | Description |
|---|---|---|
| `cashier` | `string \| null` | Cashier or server name |
| `confidence` | `number` | 0.0–1.0 — model's self-reported confidence |
| `rawText` | `string \| null` | Verbatim text extracted from the receipt |
| `warnings` | `string[]` | Anomalies detected (e.g. total mismatch) |

---

## Image Input Types

```typescript
// File path (local)
await scanner.scan('./receipt.jpg');

// URL — automatically fetched and base64-encoded
await scanner.scan('https://example.com/receipt.png');

// Node.js Buffer
const buf = await fs.readFile('./receipt.jpg');
await scanner.scan(buf);

// Uint8Array
await scanner.scan(new Uint8Array(buffer));

// Explicit base64
await scanner.scan({
  base64: 'iVBORw0KGgo...',
  mediaType: 'image/png',
});
```

**Supported formats:** JPEG, PNG, GIF, WEBP

---

## Error Handling

All errors extend `ReceiptScannerError`:

```typescript
import {
  ReceiptScannerError,
  ProviderError,
  ParseError,
  ValidationError,
  ImageInputError,
  TimeoutError,
} from 'receipt-ai-scanner';

try {
  const result = await scanner.scan('./receipt.jpg');
} catch (err) {
  if (err instanceof ProviderError) {
    // API call failed — check err.providerName and err.cause
    console.error(`Provider "${err.providerName}" failed:`, err.message);

  } else if (err instanceof ParseError) {
    // LLM returned non-JSON — check err.rawText
    console.error('Could not parse response:', err.rawText);

  } else if (err instanceof ValidationError) {
    // Zod schema failed — check err.issues
    console.error('Validation issues:', err.issues);

  } else if (err instanceof ImageInputError) {
    // Bad file path, unreadable URL, unsupported format
    console.error('Image error:', err.message);

  } else if (err instanceof TimeoutError) {
    // Request exceeded timeoutMs
    console.error('Timed out');
  }
}
```

#### Error Hierarchy

```
ReceiptScannerError
├── ProviderError       — LLM API call failed
├── ParseError          — JSON extraction from response failed
├── ValidationError     — Zod schema validation failed
├── ImageInputError     — File not found / bad URL / unsupported format
└── TimeoutError        — Request exceeded timeoutMs
```

#### Soft Validation Mode

Don't want errors for slightly malformed responses? Use `strictValidation: false` (default):

```typescript
const scanner = new ReceiptScanner({
  provider: ...,
  strictValidation: false, // returns best-effort partial data instead of throwing
});
```

---

## What Gets Extracted

The default prompt covers every field found on a typical receipt:

```
┌─────────────────────────────────────────────┐
│              RECEIPT FIELDS                  │
├──────────────────┬──────────────────────────┤
│ MERCHANT         │ name, address, city,      │
│                  │ state, zip, phone,        │
│                  │ website, tax ID           │
├──────────────────┼──────────────────────────┤
│ DATE & TIME      │ ISO 8601 date, 24h time,  │
│                  │ timezone                  │
├──────────────────┼──────────────────────────┤
│ IDENTIFIERS      │ receipt #, order #,       │
│                  │ table #, invoice #        │
├──────────────────┼──────────────────────────┤
│ LINE ITEMS       │ description, qty,         │
│                  │ unit price, total,        │
│                  │ voided flag               │
├──────────────────┼──────────────────────────┤
│ TOTALS           │ subtotal, discounts,      │
│                  │ taxes (multi-line),       │
│                  │ service charge,           │
│                  │ delivery fee, tip, total  │
├──────────────────┼──────────────────────────┤
│ PAYMENT          │ method, card brand,       │
│                  │ last 4, transaction ID,   │
│                  │ auth code, cash/change    │
├──────────────────┼──────────────────────────┤
│ METADATA         │ cashier, confidence,      │
│                  │ raw OCR text, warnings    │
└──────────────────┴──────────────────────────┘
```

---

## Extending the Prompt

Append custom instructions without replacing the default prompt:

```typescript
// Extract loyalty points
const scanner = new ReceiptScanner({
  provider: ...,
  systemPromptAppend: `
    Also extract the following if visible:
    - "loyaltyPoints": number of points earned (number | null)
    - "loyaltyBalance": total points balance (number | null)
    Add these fields to the root JSON object.
  `,
});

// Request extended line item fields (SKU, category, discount)
const scanner = new ReceiptScanner({
  provider: ...,
  systemPromptAppend:
    'For each item also extract "sku", "category", and "discountAmount" if visible on the receipt.',
});

// Per-scan custom instruction
const result = await scanner.scan('./receipt.jpg', {
  userPrompt: 'This is a restaurant receipt — pay close attention to the tip line.',
});
```


