export type WhatsappChannelConnectionStatus =
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'ERROR';

export type WhatsappChannel = {
  id: string;
  phoneNumberId: string;
  wabaId: string;
  displayPhoneNumber: string | null;
  connectionStatus: WhatsappChannelConnectionStatus;
  createdAt: string;
};
