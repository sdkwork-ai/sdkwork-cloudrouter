/** Admin provider secret update request schema exposed by Claw Router. */
export interface AdminProviderSecretUpdateRequest {
  /** Auth type field on admin provider secret update request. */
  authType?: string;
  /** Id field on admin provider secret update request. */
  id: string;
  /** Name field on admin provider secret update request. */
  name?: string;
  /** Provider code field on admin provider secret update request. */
  providerCode?: string;
  /** Vault/KMS secret reference. Plaintext provider secrets are forbidden. */
  secretRef?: string;
  /** Status field on admin provider secret update request. */
  status?: 'active' | 'disabled';
}
