import type { MediaResource } from './media-resource';

/** Site runtime settings response schema exposed by Claw Router. */
export interface SiteRuntimeSettingsResponse {
  /** Accent color field on site runtime settings response. */
  accentColor: string;
  /** Brand color field on site runtime settings response. */
  brandColor: string;
  /** Custom css field on site runtime settings response. */
  customCss: string;
  /** Description field on site runtime settings response. */
  description: string;
  /** Docs url field on site runtime settings response. */
  docsUrl: string;
  /** Favicon field on site runtime settings response. */
  favicon: MediaResource | null;
  /** Footer copyright field on site runtime settings response. */
  footerCopyright: string;
  /** Icon field on site runtime settings response. */
  icon: MediaResource | null;
  /** Icp record number field on site runtime settings response. */
  icpRecordNumber: string;
  /** Icp record url field on site runtime settings response. */
  icpRecordUrl: string;
  /** Logo field on site runtime settings response. */
  logo: MediaResource | null;
  /** Police record number field on site runtime settings response. */
  policeRecordNumber: string;
  /** Police record url field on site runtime settings response. */
  policeRecordUrl: string;
  /** Privacy url field on site runtime settings response. */
  privacyUrl: string;
  /** Seo description field on site runtime settings response. */
  seoDescription: string;
  /** Seo title field on site runtime settings response. */
  seoTitle: string;
  /** Short name field on site runtime settings response. */
  shortName: string;
  /** Site name field on site runtime settings response. */
  siteName: string;
  /** Support url field on site runtime settings response. */
  supportUrl: string;
  /** Terms url field on site runtime settings response. */
  termsUrl: string;
}
