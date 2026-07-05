export interface UpdateShopVerificationRequest {
  verificationStatus: string;
  legalEntityName?: string;
  credentialNoHash?: string;
  credentialMediaResourceId?: string;
  verificationSnapshot?: Record<string, unknown>;
  expiresAt?: string;
  reviewComment?: string;
}
