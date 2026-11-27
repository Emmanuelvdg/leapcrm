export const QUOTE_STATUSES = [
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'SENT',
  'VIEWED',
  'ACCEPTED',
  'DECLINED',
  'EXPIRED',
] as const;

export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending approval',
  APPROVED: 'Approved',
  SENT: 'Sent',
  VIEWED: 'Viewed',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
  EXPIRED: 'Expired',
};

// Statuses in which the customer's link is live and can be accepted.
export const OPEN_FOR_RESPONSE_STATUSES: QuoteStatus[] = ['SENT', 'VIEWED'];

export const FINAL_STATUSES: QuoteStatus[] = [
  'ACCEPTED',
  'DECLINED',
  'EXPIRED',
];

export const TAX_SCHEMES = ['GST', 'VAT', 'SALES_TAX', 'NONE'] as const;

export type TaxScheme = (typeof TAX_SCHEMES)[number];

export const TAX_SCHEME_LABELS: Record<TaxScheme, string> = {
  GST: 'GST (India)',
  VAT: 'VAT',
  SALES_TAX: 'Sales tax',
  NONE: 'No tax',
};

export const CURRENCY_CODES = [
  'INR',
  'USD',
  'EUR',
  'GBP',
  'AED',
  'SAR',
  'QAR',
  'KWD',
  'OMR',
  'BHD',
  'SGD',
  'MYR',
  'IDR',
  'THB',
  'HKD',
  'CNY',
  'JPY',
  'AUD',
  'NZD',
  'CAD',
  'CHF',
  'ZAR',
  'BDT',
  'LKR',
  'NPR',
] as const;

export const INDIAN_STATES = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Outside India',
] as const;
