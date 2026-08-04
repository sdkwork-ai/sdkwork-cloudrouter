import type { AdminStorageQuotaPolicy } from './admin-storage-quota-policy';
import type { PageInfo } from './page-info';

/** Admin storage quota policy list response schema exposed by Claw Router. */
export interface AdminStorageQuotaPolicyListResponse {
  /** Items field on admin storage quota policy list response. */
  items: AdminStorageQuotaPolicy[];
  /** Page info field on admin storage quota policy list response. */
  pageInfo: PageInfo;
}
