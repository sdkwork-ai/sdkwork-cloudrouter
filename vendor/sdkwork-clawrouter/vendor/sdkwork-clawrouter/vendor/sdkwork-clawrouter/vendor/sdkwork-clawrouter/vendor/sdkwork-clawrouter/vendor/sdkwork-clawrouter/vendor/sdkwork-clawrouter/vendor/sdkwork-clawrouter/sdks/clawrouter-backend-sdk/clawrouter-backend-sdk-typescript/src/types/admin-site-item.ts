import type { MediaResource } from './media-resource';

/** Admin site item schema exposed by Claw Router. */
export interface AdminSiteItem {
  /** Base url field on admin site item. */
  baseUrl: string;
  /** Consecutive error count field on admin site item. */
  consecutiveErrorCount?: string;
  /** Description field on admin site item. */
  description?: string | null;
  /** Display name field on admin site item. */
  displayName: string;
  /** Docs url field on admin site item. */
  docsUrl?: string | null;
  /** Domains field on admin site item. */
  domains?: string[];
  /** Environment field on admin site item. */
  environment: 'production' | 'sandbox';
  /** Health status field on admin site item. */
  healthStatus: 'unknown' | 'healthy' | 'degraded' | 'unhealthy';
  /** Id field on admin site item. */
  id: string;
  /** Last checked at field on admin site item. */
  lastCheckedAt?: string | null;
  /** Last latency ms field on admin site item. */
  lastLatencyMs?: string | null;
  /** Last sync at field on admin site item. */
  lastSyncAt?: string | null;
  /** Logo field on admin site item. */
  logo?: MediaResource;
  /** Owner kind field on admin site item. */
  ownerKind?: string | null;
  /** Region code field on admin site item. */
  regionCode?: string | null;
  /** Site code field on admin site item. */
  siteCode: string;
  /** Site name field on admin site item. */
  siteName: string;
  /** Site type field on admin site item. */
  siteType: 'relay';
  /** Sort order field on admin site item. */
  sortOrder?: string;
  /** Status field on admin site item. */
  status: 'active' | 'disabled';
  /** Vendor codes field on admin site item. */
  vendorCodes?: string[];
  /** Website url field on admin site item. */
  websiteUrl?: string | null;
}
