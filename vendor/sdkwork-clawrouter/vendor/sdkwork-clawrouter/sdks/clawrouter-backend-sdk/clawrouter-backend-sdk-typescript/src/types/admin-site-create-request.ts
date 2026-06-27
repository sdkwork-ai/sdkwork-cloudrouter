import type { MediaResource } from './media-resource';

/** Admin site create request schema exposed by Claw Router. */
export interface AdminSiteCreateRequest {
  /** Base url field on admin site create request. */
  baseUrl: string;
  /** Credential ref field on admin site create request. */
  credentialRef?: string | null;
  /** Description field on admin site create request. */
  description?: string | null;
  /** Display name field on admin site create request. */
  displayName: string;
  /** Docs url field on admin site create request. */
  docsUrl?: string | null;
  /** Domains field on admin site create request. */
  domains?: string[];
  /** Environment field on admin site create request. */
  environment?: 'production' | 'sandbox';
  /** Logo field on admin site create request. */
  logo?: MediaResource;
  /** Masked label field on admin site create request. */
  maskedLabel?: string | null;
  /** Owner kind field on admin site create request. */
  ownerKind?: string | null;
  /** Region code field on admin site create request. */
  regionCode?: string | null;
  /** Site code field on admin site create request. */
  siteCode?: string;
  /** Site name field on admin site create request. */
  siteName: string;
  /** Site type field on admin site create request. */
  siteType?: 'relay';
  /** Status field on admin site create request. */
  status?: 'active' | 'disabled';
  /** Vendor codes field on admin site create request. */
  vendorCodes?: string[];
  /** Website url field on admin site create request. */
  websiteUrl?: string | null;
}
