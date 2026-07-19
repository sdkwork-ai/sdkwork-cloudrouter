/** AdminSiteItem contract. */
export interface AdminSiteItem {
  /** baseUrl field on AdminSiteItem. */
  baseUrl: string;
  /** consecutiveErrorCount field on AdminSiteItem. */
  consecutiveErrorCount: number;
  /** description field on AdminSiteItem. */
  description: string | unknown;
  /** displayName field on AdminSiteItem. */
  displayName: string;
  /** docsUrl field on AdminSiteItem. */
  docsUrl: string | unknown;
  /** domains field on AdminSiteItem. */
  domains: string[];
  /** environment field on AdminSiteItem. */
  environment: 'production' | 'sandbox';
  /** healthStatus field on AdminSiteItem. */
  healthStatus: 'unknown' | 'healthy' | 'degraded' | 'unhealthy';
  /** id field on AdminSiteItem. */
  id: string;
  /** lastCheckedAt field on AdminSiteItem. */
  lastCheckedAt: string;
  /** lastLatencyMs field on AdminSiteItem. */
  lastLatencyMs: number | unknown;
  /** lastSyncAt field on AdminSiteItem. */
  lastSyncAt: string;
  /** logo field on AdminSiteItem. */
  logo: Record<string, unknown> | unknown;
  /** ownerKind field on AdminSiteItem. */
  ownerKind: string | unknown;
  /** regionCode field on AdminSiteItem. */
  regionCode: string | unknown;
  /** siteCode field on AdminSiteItem. */
  siteCode: string;
  /** siteName field on AdminSiteItem. */
  siteName: string;
  /** siteType field on AdminSiteItem. */
  siteType: 'relay';
  /** sortOrder field on AdminSiteItem. */
  sortOrder: number;
  /** status field on AdminSiteItem. */
  status: 'active' | 'disabled';
  /** vendorCodes field on AdminSiteItem. */
  vendorCodes: string[];
  /** websiteUrl field on AdminSiteItem. */
  websiteUrl: string | unknown;
}
