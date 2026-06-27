import type { ServiceProviderCollectionResponse } from './service-provider-collection-response';

/** Provider wallet accounts list result schema exposed by Claw Router. */
export interface ProviderWalletAccountsListResult {
  /** Business response code. */
  code: string;
  /** Data field on provider wallet accounts list result. */
  data?: ServiceProviderCollectionResponse;
  /** Human-readable response message. */
  msg?: string;
}
