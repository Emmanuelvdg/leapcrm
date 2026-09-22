// Shape of Meta's WhatsApp Business Cloud API webhook POST body.
// https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks

export type WhatsappWebhookContact = {
  profile?: { name?: string };
  wa_id: string;
};

export type WhatsappWebhookTextMessage = {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
};

export type WhatsappWebhookStatus = {
  id: string;
  status: string;
  timestamp: string;
  recipient_id: string;
};

export type WhatsappWebhookChangeValue = {
  messaging_product: 'whatsapp';
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: WhatsappWebhookContact[];
  messages?: WhatsappWebhookTextMessage[];
  statuses?: WhatsappWebhookStatus[];
};

export type WhatsappWebhookChange = {
  value: WhatsappWebhookChangeValue;
  field: string;
};

export type WhatsappWebhookEntry = {
  id: string;
  changes: WhatsappWebhookChange[];
};

export type WhatsappWebhookPayload = {
  object: string;
  entry: WhatsappWebhookEntry[];
};
