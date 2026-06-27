import type { AdminCacheKeyItem } from './admin-cache-key-item';

/** Admin cache key list response schema exposed by Claw Router. */
export interface AdminCacheKeyListResponse {
  /** Has more field on admin cache key list response. */
  hasMore: boolean;
  /** Instance name field on admin cache key list response. */
  instanceName: string;
  /** Items field on admin cache key list response. */
  items: AdminCacheKeyItem[];
  /** Limit field on admin cache key list response. */
  limit: string | null;
  /** Namespace field on admin cache key list response. */
  namespace: string;
  /** Next cursor field on admin cache key list response. */
  nextCursor: string | null;
  /** Returned items field on admin cache key list response. */
  returnedItems: string;
  /** Scan complete field on admin cache key list response. */
  scanComplete: boolean;
  /** Scanned items field on admin cache key list response. */
  scannedItems: string;
}
