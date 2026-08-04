import type { AdminStorageProvider } from './admin-storage-provider';
import type { PageInfo } from './page-info';

/** Admin storage provider list response schema exposed by Cloud Router. */
export interface AdminStorageProviderListResponse {
  /** Items field on admin storage provider list response. */
  items: AdminStorageProvider[];
  /** Page info field on admin storage provider list response. */
  pageInfo: PageInfo;
}
