import type { PageInfo } from './page-info';
import type { UpstreamAccountCredential } from './upstream-account-credential';

/** Upstream account credential list response schema exposed by Claw Router. */
export interface UpstreamAccountCredentialListResponse {
  /** Items field on upstream account credential list response. */
  items: UpstreamAccountCredential[];
  /** Page info field on upstream account credential list response. */
  pageInfo: PageInfo;
}
