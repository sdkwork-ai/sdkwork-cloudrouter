import type { MediaResource } from './media-resource';

/** Admin site settings update request schema exposed by Claw Router. */
export interface AdminSiteSettingsUpdateRequest {
  /** Accent color field on admin site settings update request. */
  accentColor?: string;
  /** Brand color field on admin site settings update request. */
  brandColor?: string;
  /** Custom css field on admin site settings update request. */
  customCss?: string;
  /** Description field on admin site settings update request. */
  description?: string;
  /** Docs url field on admin site settings update request. */
  docsUrl?: string;
  /** Favicon field on admin site settings update request. */
  favicon?: MediaResource;
  /** Footer copyright field on admin site settings update request. */
  footerCopyright?: string;
  /** Icon field on admin site settings update request. */
  icon?: MediaResource;
  /** Icp record number field on admin site settings update request. */
  icpRecordNumber?: string;
  /** Icp record url field on admin site settings update request. */
  icpRecordUrl?: string;
  /** Logo field on admin site settings update request. */
  logo?: MediaResource;
  /** Police record number field on admin site settings update request. */
  policeRecordNumber?: string;
  /** Police record url field on admin site settings update request. */
  policeRecordUrl?: string;
  /** Privacy url field on admin site settings update request. */
  privacyUrl?: string;
  /** Seo description field on admin site settings update request. */
  seoDescription?: string;
  /** Seo title field on admin site settings update request. */
  seoTitle?: string;
  /** Short name field on admin site settings update request. */
  shortName?: string;
  /** Site name field on admin site settings update request. */
  siteName?: string;
  /** Support url field on admin site settings update request. */
  supportUrl?: string;
  /** Terms url field on admin site settings update request. */
  termsUrl?: string;
}
