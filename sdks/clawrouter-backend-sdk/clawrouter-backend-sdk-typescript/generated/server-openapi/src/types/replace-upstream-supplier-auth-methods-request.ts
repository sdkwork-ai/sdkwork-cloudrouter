import type { UpstreamSupplierAuthMethodInput } from './upstream-supplier-auth-method-input';

/** Replace upstream supplier auth methods request schema exposed by Claw Router. */
export interface ReplaceUpstreamSupplierAuthMethodsRequest {
  /** Items field on replace upstream supplier auth methods request. */
  items: UpstreamSupplierAuthMethodInput[];
}
