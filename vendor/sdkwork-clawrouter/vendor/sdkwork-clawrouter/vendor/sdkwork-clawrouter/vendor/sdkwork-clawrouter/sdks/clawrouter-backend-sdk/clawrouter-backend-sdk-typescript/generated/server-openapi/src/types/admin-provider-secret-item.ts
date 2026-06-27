/** Persisted provider secret account snapshot returned by the backend. */
export interface AdminProviderSecretItem {
  /** Account code field on admin provider secret item. */
  accountCode: string;
  /** Auth type field on admin provider secret item. */
  authType: string;
  /** Created at field on admin provider secret item. */
  createdAt: string;
  /** Id field on admin provider secret item. */
  id: string;
  /** Masked label field on admin provider secret item. */
  maskedLabel: string;
  /** Name field on admin provider secret item. */
  name: string;
  /** Provider code field on admin provider secret item. */
  providerCode: string;
  /** Secret ref field on admin provider secret item. */
  secretRef: string;
  /** Status field on admin provider secret item. */
  status: 'active' | 'disabled';
  /** Updated at field on admin provider secret item. */
  updatedAt: string;
}
