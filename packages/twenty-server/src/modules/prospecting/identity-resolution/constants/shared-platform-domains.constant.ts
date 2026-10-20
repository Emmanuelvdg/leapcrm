// Sources sometimes give a social or marketplace page as a company website.
// Those domains are shared by many companies, so they must never identify
// one.
export const SHARED_PLATFORM_DOMAINS = new Set([
  'facebook.com',
  'instagram.com',
  'linkedin.com',
  'twitter.com',
  'x.com',
  'youtube.com',
  'tiktok.com',
  'medium.com',
  'github.com',
  'google.com',
  'sites.google.com',
  'linktr.ee',
  'wa.me',
  'shopee.sg',
  'lazada.sg',
  'amazon.com',
]);
