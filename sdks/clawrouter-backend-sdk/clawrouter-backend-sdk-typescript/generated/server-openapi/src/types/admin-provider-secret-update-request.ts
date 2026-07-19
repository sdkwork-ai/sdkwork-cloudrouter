/** AdminProviderSecretUpdateRequest contract. */
export interface AdminProviderSecretUpdateRequest {
  /** authType field on AdminProviderSecretUpdateRequest. */
  authType?: string;
  /** id field on AdminProviderSecretUpdateRequest. */
  id?: string;
  /** name field on AdminProviderSecretUpdateRequest. */
  name?: string;
  /** providerCode field on AdminProviderSecretUpdateRequest. */
  providerCode?: string;
  /** secretRef field on AdminProviderSecretUpdateRequest. */
  secretRef?: string;
  /** status field on AdminProviderSecretUpdateRequest. */
  status?: 'active' | 'disabled';
}
