import type { StorageProviderListResponse } from './storage-provider-list-response';

/** Oss providers list result schema exposed by Claw Router. */
export interface OssProvidersListResult {
  /** Business response code. */
  code: string;
  /** Data field on oss providers list result. */
  data?: StorageProviderListResponse;
  /** Human-readable response message. */
  msg?: string;
}
