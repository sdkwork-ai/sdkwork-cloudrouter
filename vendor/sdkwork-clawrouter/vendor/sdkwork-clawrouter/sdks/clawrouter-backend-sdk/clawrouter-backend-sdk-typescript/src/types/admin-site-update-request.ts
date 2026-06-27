import type { MediaResource } from './media-resource';

/** Admin site update request schema exposed by Claw Router. */
export interface AdminSiteUpdateRequest {
  /** Base url field on admin site update request. */
  baseUrl?: string;
  /** Credential ref field on admin site update request. */
  credentialRef?: string | null;
  /** Description field on admin site update request. */
  description?: string | null;
  /** Display name field on admin site update request. */
  displayName?: string;
  /** Docs url field on admin site update request. */
  docsUrl?: string | null;
  /** Domains field on admin site update request. */
  domains?: string[];
  /** Environment field on admin site update request. */
  environment?: 'production' | 'sandbox';
  /** Logo field on admin site update request. */
  logo?: MediaResource;
  /** Masked label field on admin site update request. */
  maskedLabel?: string | null;
  /** Owner kind field on admin site update request. */
  ownerKind?: string | null;
  /** Region code field on admin site update request. */
  regionCode?: string | null;
  /** Site code field on admin site update request. */
  siteCode?: string;
  /** Site name field on admin site update request. */
  siteName?: string;
  /** Site type field on admin site update request. */
  siteType?: 'relay';
  /** Status field on admin site update request. */
  status?: 'active' | 'disabled';
  /** Vendor codes field on admin site update request. */
  vendorCodes?: string[];
  /** Website url field on admin site update request. */
  websiteUrl?: string | null;
}
