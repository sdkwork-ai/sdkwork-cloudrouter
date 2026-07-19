/** AdminProviderSecretItem contract. */
export interface AdminProviderSecretItem {
  /** accountCode field on AdminProviderSecretItem. */
  accountCode: string;
  /** authType field on AdminProviderSecretItem. */
  authType: string;
  /** createdAt field on AdminProviderSecretItem. */
  createdAt: string;
  /** id field on AdminProviderSecretItem. */
  id: string;
  /** maskedLabel field on AdminProviderSecretItem. */
  maskedLabel: string;
  /** name field on AdminProviderSecretItem. */
  name: string;
  /** providerCode field on AdminProviderSecretItem. */
  providerCode: string;
  /** secretRef field on AdminProviderSecretItem. */
  secretRef: string;
  /** status field on AdminProviderSecretItem. */
  status: 'active' | 'disabled';
  /** updatedAt field on AdminProviderSecretItem. */
  updatedAt: string;
}
