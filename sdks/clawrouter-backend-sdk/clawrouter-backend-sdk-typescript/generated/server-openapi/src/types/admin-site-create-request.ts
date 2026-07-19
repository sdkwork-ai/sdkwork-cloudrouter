/** AdminSiteCreateRequest contract. */
export interface AdminSiteCreateRequest {
  /** baseUrl field on AdminSiteCreateRequest. */
  baseUrl: string;
  /** credentialRef field on AdminSiteCreateRequest. */
  credentialRef?: string | unknown;
  /** description field on AdminSiteCreateRequest. */
  description?: string | unknown;
  /** displayName field on AdminSiteCreateRequest. */
  displayName: string;
  /** docsUrl field on AdminSiteCreateRequest. */
  docsUrl?: string | unknown;
  /** domains field on AdminSiteCreateRequest. */
  domains?: string[];
  /** environment field on AdminSiteCreateRequest. */
  environment?: 'production' | 'sandbox';
  /** logo field on AdminSiteCreateRequest. */
  logo?: Record<string, unknown> | unknown;
  /** maskedLabel field on AdminSiteCreateRequest. */
  maskedLabel?: string | unknown;
  /** ownerKind field on AdminSiteCreateRequest. */
  ownerKind?: string | unknown;
  /** regionCode field on AdminSiteCreateRequest. */
  regionCode?: string | unknown;
  /** siteCode field on AdminSiteCreateRequest. */
  siteCode?: string;
  /** siteName field on AdminSiteCreateRequest. */
  siteName: string;
  /** siteType field on AdminSiteCreateRequest. */
  siteType?: 'relay';
  /** status field on AdminSiteCreateRequest. */
  status?: 'active' | 'disabled';
  /** vendorCodes field on AdminSiteCreateRequest. */
  vendorCodes?: string[];
  /** websiteUrl field on AdminSiteCreateRequest. */
  websiteUrl?: string | unknown;
}
