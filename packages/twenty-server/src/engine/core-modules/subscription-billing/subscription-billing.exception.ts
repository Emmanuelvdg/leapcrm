import { CustomException } from 'src/utils/custom-exception';

export enum SubscriptionBillingExceptionCode {
  STRIPE_NOT_CONFIGURED = 'STRIPE_NOT_CONFIGURED',
  SUBSCRIPTION_ALREADY_EXISTS = 'SUBSCRIPTION_ALREADY_EXISTS',
  NO_ACTIVE_PLAN = 'NO_ACTIVE_PLAN',
  NO_STRIPE_CUSTOMER = 'NO_STRIPE_CUSTOMER',
  NO_SEATS_AVAILABLE = 'NO_SEATS_AVAILABLE',
}

export class SubscriptionBillingException extends CustomException<SubscriptionBillingExceptionCode> {}
