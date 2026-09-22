import { createHmac, timingSafeEqual } from 'crypto';

const SIGNATURE_PREFIX = 'sha256=';

// Meta signs the raw request body with the app secret and sends it as
// `X-Hub-Signature-256: sha256=<hex-hmac>`. Must run against the raw bytes,
// not the JSON-parsed body — reserializing can change byte-for-byte content
// (key order, whitespace) and break the signature.
export function verifyWhatsappWebhookSignature({
  rawBody,
  signatureHeader,
  appSecret,
}: {
  rawBody: Buffer;
  signatureHeader: string | undefined;
  appSecret: string;
}): boolean {
  if (!signatureHeader || !signatureHeader.startsWith(SIGNATURE_PREFIX)) {
    return false;
  }

  const receivedSignature = signatureHeader.slice(SIGNATURE_PREFIX.length);
  const expectedSignature = createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex');

  const receivedBuffer = Buffer.from(receivedSignature, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  if (receivedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(receivedBuffer, expectedBuffer);
}
