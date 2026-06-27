import type { StorageQuotaListResponse } from './storage-quota-list-response';

/** Oss quotas list result schema exposed by Claw Router. */
export interface OssQuotasListResult {
  /** Business response code. */
  code: string;
  /** Data field on oss quotas list result. */
  data?: StorageQuotaListResponse;
  /** Human-readable response message. */
  msg?: string;
}
