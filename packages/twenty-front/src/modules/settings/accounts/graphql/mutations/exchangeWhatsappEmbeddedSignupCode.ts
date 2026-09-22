import { gql } from '@apollo/client';

export const EXCHANGE_WHATSAPP_EMBEDDED_SIGNUP_CODE = gql`
  mutation ExchangeWhatsappEmbeddedSignupCode(
    $input: ExchangeWhatsappEmbeddedSignupCodeInput!
  ) {
    exchangeWhatsappEmbeddedSignupCode(input: $input) {
      id
      phoneNumberId
      wabaId
      displayPhoneNumber
      connectionStatus
      createdAt
    }
  }
`;
