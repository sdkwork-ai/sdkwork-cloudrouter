import type { MediaResource } from './media-resource';

/** Admin site settings response schema exposed by Claw Router. */
export interface AdminSiteSettingsResponse {
  /** Accent color field on admin site settings response. */
  accentColor: string;
  /** Brand color field on admin site settings response. */
  brandColor: string;
  /** Custom css field on admin site settings response. */
  customCss: string;
  /** Description field on admin site settings response. */
  description: string;
  /** Docs url field on admin site settings response. */
  docsUrl: string;
  /** Favicon field on admin site settings response. */
  favicon: MediaResource;
  /** Footer copyright field on admin site settings response. */
  footerCopyright: string;
  /** Icon field on admin site settings response. */
  icon: MediaResource;
  /** Icp record number field on admin site settings response. */
  icpRecordNumber: string;
  /** Icp record url field on admin site settings response. */
  icpRecordUrl: string;
  /** Logo field on admin site settings response. */
  logo: MediaResource;
  /** Police record number field on admin site settings response. */
  policeRecordNumber: string;
  /** Police record url field on admin site settings response. */
  policeRecordUrl: string;
  /** Privacy url field on admin site settings response. */
  privacyUrl: string;
  /** Seo description field on admin site settings response. */
  seoDescription: string;
  /** Seo title field on admin site settings response. */
  seoTitle: string;
  /** Short name field on admin site settings response. */
  shortName: string;
  /** Site name field on admin site settings response. */
  siteName: string;
  /** Support url field on admin site settings response. */
  supportUrl: string;
  /** Terms url field on admin site settings response. */
  termsUrl: string;
}
