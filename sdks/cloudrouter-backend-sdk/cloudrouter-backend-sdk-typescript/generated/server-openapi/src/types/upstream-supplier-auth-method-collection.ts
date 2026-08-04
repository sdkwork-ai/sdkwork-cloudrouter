import type { UpstreamSupplierAuthMethod } from './upstream-supplier-auth-method';

/** Upstream supplier auth method collection schema exposed by Cloud Router. */
export interface UpstreamSupplierAuthMethodCollection {
  /** Id field on upstream supplier auth method collection. */
  id: string;
  /** Items field on upstream supplier auth method collection. */
  items: UpstreamSupplierAuthMethod[];
}
