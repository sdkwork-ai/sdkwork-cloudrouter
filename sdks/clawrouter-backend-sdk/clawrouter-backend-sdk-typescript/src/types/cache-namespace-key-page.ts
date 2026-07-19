import type { PageInfo } from './page-info';

/** CacheNamespaceKeyPage contract. */
export interface CacheNamespaceKeyPage {
  /** instanceName field on CacheNamespaceKeyPage. */
  instanceName: string;
  /** items field on CacheNamespaceKeyPage. */
  items: Record<string, unknown>[];
  /** namespace field on CacheNamespaceKeyPage. */
  namespace: string;
  /** pageInfo field on CacheNamespaceKeyPage. */
  pageInfo: PageInfo;
  /** returnedItems field on CacheNamespaceKeyPage. */
  returnedItems: string;
  /** scanComplete field on CacheNamespaceKeyPage. */
  scanComplete: boolean;
  /** scannedItems field on CacheNamespaceKeyPage. */
  scannedItems: string;
}
