import type { AdminStorageUsage } from './admin-storage-usage';
import type { PageInfo } from './page-info';

/** Admin storage usage list response schema exposed by Cloud Router. */
export interface AdminStorageUsageListResponse {
  /** Items field on admin storage usage list response. */
  items: AdminStorageUsage[];
  /** Page info field on admin storage usage list response. */
  pageInfo: PageInfo;
}
