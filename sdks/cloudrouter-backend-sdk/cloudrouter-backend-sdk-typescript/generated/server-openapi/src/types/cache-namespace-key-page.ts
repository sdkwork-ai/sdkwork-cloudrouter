import type { JsonValue } from './json-value';
import type { PageInfo } from './page-info';

/** CacheNamespaceKeyPage contract. */
export interface CacheNamespaceKeyPage {
  /** instanceName field on CacheNamespaceKeyPage. */
  instanceName: string;
  /** items field on CacheNamespaceKeyPage. */
  items: Record<string, JsonValue>[];
  /** namespace field on CacheNamespaceKeyPage. */
  namespace: string;
  /** Page info field on cache namespace key page. */
  pageInfo: PageInfo;
  /** returnedItems field on CacheNamespaceKeyPage. */
  returnedItems: string;
  /** scanComplete field on CacheNamespaceKeyPage. */
  scanComplete: boolean;
  /** scannedItems field on CacheNamespaceKeyPage. */
  scannedItems: string;
}
