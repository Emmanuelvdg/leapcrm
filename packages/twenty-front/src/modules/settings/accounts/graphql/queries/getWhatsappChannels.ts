import { gql } from '@apollo/client';

export const GET_WHATSAPP_CHANNELS = gql`
  query GetWhatsappChannels {
    getWhatsappChannels {
      id
      phoneNumberId
      wabaId
      displayPhoneNumber
      connectionStatus
      createdAt
    }
  }
`;
