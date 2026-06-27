import type { StorageProviderCreateResponse } from './storage-provider-create-response';

/** Oss providers create result schema exposed by Claw Router. */
export interface OssProvidersCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on oss providers create result. */
  data?: StorageProviderCreateResponse;
  /** Human-readable response message. */
  msg?: string;
}
