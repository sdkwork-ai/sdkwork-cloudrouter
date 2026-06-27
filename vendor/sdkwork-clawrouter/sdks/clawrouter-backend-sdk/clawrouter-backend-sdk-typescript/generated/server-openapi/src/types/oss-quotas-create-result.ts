import type { StorageQuotaCreateResponse } from './storage-quota-create-response';

/** Oss quotas create result schema exposed by Claw Router. */
export interface OssQuotasCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on oss quotas create result. */
  data?: StorageQuotaCreateResponse;
  /** Human-readable response message. */
  msg?: string;
}
