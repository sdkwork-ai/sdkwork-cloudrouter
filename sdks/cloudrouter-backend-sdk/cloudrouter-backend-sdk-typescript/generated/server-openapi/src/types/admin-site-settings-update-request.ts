import type { MediaResource } from './media-resource';

/** AdminSiteSettingsUpdateRequest contract. */
export interface AdminSiteSettingsUpdateRequest {
  /** accentColor field on AdminSiteSettingsUpdateRequest. */
  accentColor?: string;
  /** brandColor field on AdminSiteSettingsUpdateRequest. */
  brandColor?: string;
  /** customCss field on AdminSiteSettingsUpdateRequest. */
  customCss?: string;
  /** description field on AdminSiteSettingsUpdateRequest. */
  description?: string;
  /** docsUrl field on AdminSiteSettingsUpdateRequest. */
  docsUrl?: string;
  /** Favicon field on admin site settings update request. */
  favicon?: MediaResource;
  /** footerCopyright field on AdminSiteSettingsUpdateRequest. */
  footerCopyright?: string;
  /** Icon field on admin site settings update request. */
  icon?: MediaResource;
  /** icpRecordNumber field on AdminSiteSettingsUpdateRequest. */
  icpRecordNumber?: string;
  /** icpRecordUrl field on AdminSiteSettingsUpdateRequest. */
  icpRecordUrl?: string;
  /** Logo field on admin site settings update request. */
  logo?: MediaResource;
  /** policeRecordNumber field on AdminSiteSettingsUpdateRequest. */
  policeRecordNumber?: string;
  /** policeRecordUrl field on AdminSiteSettingsUpdateRequest. */
  policeRecordUrl?: string;
  /** privacyUrl field on AdminSiteSettingsUpdateRequest. */
  privacyUrl?: string;
  /** seoDescription field on AdminSiteSettingsUpdateRequest. */
  seoDescription?: string;
  /** seoTitle field on AdminSiteSettingsUpdateRequest. */
  seoTitle?: string;
  /** shortName field on AdminSiteSettingsUpdateRequest. */
  shortName?: string;
  /** siteName field on AdminSiteSettingsUpdateRequest. */
  siteName?: string;
  /** supportUrl field on AdminSiteSettingsUpdateRequest. */
  supportUrl?: string;
  /** termsUrl field on AdminSiteSettingsUpdateRequest. */
  termsUrl?: string;
}
