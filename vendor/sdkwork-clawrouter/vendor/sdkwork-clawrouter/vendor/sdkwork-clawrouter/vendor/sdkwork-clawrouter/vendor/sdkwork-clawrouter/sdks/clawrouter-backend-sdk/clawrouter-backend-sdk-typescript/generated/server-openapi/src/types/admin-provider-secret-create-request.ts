/** Admin provider secret create request schema exposed by Claw Router. */
export interface AdminProviderSecretCreateRequest {
  /** Auth type field on admin provider secret create request. */
  authType?: string;
  /** Name field on admin provider secret create request. */
  name: string;
  /** Provider code field on admin provider secret create request. */
  providerCode: string;
  /** Vault/KMS secret reference. Plaintext provider secrets are forbidden. */
  secretRef: string;
  /** Status field on admin provider secret create request. */
  status?: 'active' | 'disabled';
}
