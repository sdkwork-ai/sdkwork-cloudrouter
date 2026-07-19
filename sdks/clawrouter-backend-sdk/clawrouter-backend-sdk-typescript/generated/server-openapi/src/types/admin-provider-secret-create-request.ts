/** AdminProviderSecretCreateRequest contract. */
export interface AdminProviderSecretCreateRequest {
  /** authType field on AdminProviderSecretCreateRequest. */
  authType?: string;
  /** id field on AdminProviderSecretCreateRequest. */
  id?: string;
  /** name field on AdminProviderSecretCreateRequest. */
  name: string;
  /** providerCode field on AdminProviderSecretCreateRequest. */
  providerCode: string;
  /** secretRef field on AdminProviderSecretCreateRequest. */
  secretRef: string;
  /** status field on AdminProviderSecretCreateRequest. */
  status?: 'active' | 'disabled';
}
