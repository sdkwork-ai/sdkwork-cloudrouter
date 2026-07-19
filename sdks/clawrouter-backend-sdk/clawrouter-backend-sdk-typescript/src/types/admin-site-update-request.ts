/** AdminSiteUpdateRequest contract. */
export interface AdminSiteUpdateRequest {
  /** baseUrl field on AdminSiteUpdateRequest. */
  baseUrl?: string;
  /** credentialRef field on AdminSiteUpdateRequest. */
  credentialRef?: string | unknown;
  /** description field on AdminSiteUpdateRequest. */
  description?: string | unknown;
  /** displayName field on AdminSiteUpdateRequest. */
  displayName?: string;
  /** docsUrl field on AdminSiteUpdateRequest. */
  docsUrl?: string | unknown;
  /** domains field on AdminSiteUpdateRequest. */
  domains?: string[];
  /** environment field on AdminSiteUpdateRequest. */
  environment?: 'production' | 'sandbox';
  /** logo field on AdminSiteUpdateRequest. */
  logo?: Record<string, unknown> | unknown;
  /** maskedLabel field on AdminSiteUpdateRequest. */
  maskedLabel?: string | unknown;
  /** ownerKind field on AdminSiteUpdateRequest. */
  ownerKind?: string | unknown;
  /** regionCode field on AdminSiteUpdateRequest. */
  regionCode?: string | unknown;
  /** siteCode field on AdminSiteUpdateRequest. */
  siteCode?: string;
  /** siteName field on AdminSiteUpdateRequest. */
  siteName?: string;
  /** siteType field on AdminSiteUpdateRequest. */
  siteType?: 'relay';
  /** status field on AdminSiteUpdateRequest. */
  status?: 'active' | 'disabled';
  /** vendorCodes field on AdminSiteUpdateRequest. */
  vendorCodes?: string[];
  /** websiteUrl field on AdminSiteUpdateRequest. */
  websiteUrl?: string | unknown;
}
