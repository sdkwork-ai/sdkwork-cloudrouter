/** Payment provider account mutation request schema exposed by Claw Router. */
export interface PaymentProviderAccountMutationRequest {
  /** Account role field on payment provider account mutation request. */
  accountRole?: 'merchant' | 'service_provider';
  /** Certificate ref field on payment provider account mutation request. */
  certificateRef?: string;
  /** Client request no field on payment provider account mutation request. */
  clientRequestNo?: string;
  /** Country code field on payment provider account mutation request. */
  countryCode: string;
  /** Environment field on payment provider account mutation request. */
  environment: 'sandbox' | 'production';
  /** Merchant id field on payment provider account mutation request. */
  merchantId: string;
  /** Note field on payment provider account mutation request. */
  note?: string;
  /** Provider code field on payment provider account mutation request. */
  providerCode: string;
  /** Rotated at field on payment provider account mutation request. */
  rotatedAt?: string;
  /** Secret ref field on payment provider account mutation request. */
  secretRef: string;
  /** Settlement currency field on payment provider account mutation request. */
  settlementCurrency: string;
  /** Status field on payment provider account mutation request. */
  status: 'active' | 'inactive' | 'disabled';
  /** Webhook secret ref field on payment provider account mutation request. */
  webhookSecretRef?: string;
}
