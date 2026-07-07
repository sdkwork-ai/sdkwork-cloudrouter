import type { PageInfo } from './page-info';

/** Cache namespace key page schema exposed by Claw Router. */
export interface CacheNamespaceKeyPage {
  /** Instance name field on cache namespace key page. */
  instanceName: string;
  /** Items field on cache namespace key page. */
  items: Record<string, unknown>[];
  /** Namespace field on cache namespace key page. */
  namespace: string;
  /** Page info field on cache namespace key page. */
  pageInfo: PageInfo;
  /** Returned items field on cache namespace key page. */
  returnedItems: string;
  /** Scan complete field on cache namespace key page. */
  scanComplete: boolean;
  /** Scanned items field on cache namespace key page. */
  scannedItems: string;
}
