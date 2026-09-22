import { gql } from '@apollo/client';

export const DISCONNECT_WHATSAPP_CHANNEL = gql`
  mutation DisconnectWhatsappChannel($id: String!) {
    disconnectWhatsappChannel(id: $id)
  }
`;
