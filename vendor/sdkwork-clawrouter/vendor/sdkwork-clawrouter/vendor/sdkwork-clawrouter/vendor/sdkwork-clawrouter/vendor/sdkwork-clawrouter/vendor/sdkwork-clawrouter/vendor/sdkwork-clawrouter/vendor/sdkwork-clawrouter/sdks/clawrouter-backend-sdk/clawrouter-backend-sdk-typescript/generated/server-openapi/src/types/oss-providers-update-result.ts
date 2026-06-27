import type { StorageProviderUpdateResponse } from './storage-provider-update-response';

/** Oss providers update result schema exposed by Claw Router. */
export interface OssProvidersUpdateResult {
  /** Business response code. */
  code: string;
  /** Data field on oss providers update result. */
  data?: StorageProviderUpdateResponse;
  /** Human-readable response message. */
  msg?: string;
}
