export interface CreateShopPolicyRequest {
  policyType: string;
  policyStatus: string;
  policyVersion: number;
  policy: Record<string, unknown>;
  publishedAt?: string;
}
