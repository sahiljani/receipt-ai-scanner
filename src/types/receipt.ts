export type SupportedMediaType =
  | 'image/jpeg'
  | 'image/png'
  | 'image/gif'
  | 'image/webp';

export type ImageInput =
  | string
  | Buffer
  | Uint8Array
  | { base64: string; mediaType: SupportedMediaType };

export interface Merchant {
  name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  phone: string | null;
  website: string | null;
  taxId: string | null;
}

export interface LineItem {
  description: string;
  quantity: number | null;
  unitPrice: number | null;
  totalPrice: number;
  sku: string | null;
  category: string | null;
  discountAmount: number | null;
  isVoided: boolean;
}

export interface TaxEntry {
  label: string;
  rate: number | null;
  amount: number;
}

export interface PaymentInfo {
  method: 'cash' | 'card' | 'digital_wallet' | 'check' | 'other' | null;
  cardBrand: string | null;
  cardLastFour: string | null;
  transactionId: string | null;
  authCode: string | null;
  tip: number | null;
  cashGiven: number | null;
  changeGiven: number | null;
}

export interface ReceiptData {
  merchant: Merchant;
  date: string | null;
  time: string | null;
  timezone: string | null;
  receiptNumber: string | null;
  orderNumber: string | null;
  tableNumber: string | null;
  invoiceNumber: string | null;
  items: LineItem[];
  subtotal: number | null;
  discountTotal: number | null;
  taxes: TaxEntry[];
  serviceCharge: number | null;
  deliveryFee: number | null;
  tip: number | null;
  total: number;
  currency: string | null;
  payment: PaymentInfo;
  cashier: string | null;
  confidence: number;
  rawText: string | null;
  warnings: string[];
}
