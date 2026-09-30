import type { JsonValue } from './json-value';
import type { MediaResource } from './media-resource';

/** AdminSiteSettingsUpdateRequest contract. */
export interface AdminSiteSettingsUpdateRequest {
  /** accentColor field on AdminSiteSettingsUpdateRequest. */
  accentColor?: string;
  /** brandColor field on AdminSiteSettingsUpdateRequest. */
  brandColor?: string;
  /** Community group qr code field on admin site settings update request. */
  communityGroupQrCode?: MediaResource;
  /** communityGroupQrCodeEnabled field on AdminSiteSettingsUpdateRequest. */
  communityGroupQrCodeEnabled?: boolean;
  /** customCss field on AdminSiteSettingsUpdateRequest. */
  customCss?: string;
  /** description field on AdminSiteSettingsUpdateRequest. */
  description?: string;
  /** descriptionI18n field on AdminSiteSettingsUpdateRequest. */
  descriptionI18n?: Record<string, string>;
  /** docsUrl field on AdminSiteSettingsUpdateRequest. */
  docsUrl?: string;
  /** Douyin qr code field on admin site settings update request. */
  douyinQrCode?: MediaResource;
  /** douyinQrCodeEnabled field on AdminSiteSettingsUpdateRequest. */
  douyinQrCodeEnabled?: boolean;
  /** downloads field on AdminSiteSettingsUpdateRequest. */
  downloads?: Record<string, JsonValue>;
  /** Favicon field on admin site settings update request. */
  favicon?: MediaResource;
  /** footerBrandEnabled field on AdminSiteSettingsUpdateRequest. */
  footerBrandEnabled?: boolean;
  /** footerCompanyLinksEnabled field on AdminSiteSettingsUpdateRequest. */
  footerCompanyLinksEnabled?: boolean;
  /** footerCopyright field on AdminSiteSettingsUpdateRequest. */
  footerCopyright?: string;
  /** footerCopyrightI18n field on AdminSiteSettingsUpdateRequest. */
  footerCopyrightI18n?: Record<string, string>;
  /** footerLegalEnabled field on AdminSiteSettingsUpdateRequest. */
  footerLegalEnabled?: boolean;
  /** footerNewsletterEnabled field on AdminSiteSettingsUpdateRequest. */
  footerNewsletterEnabled?: boolean;
  /** footerProductLinksEnabled field on AdminSiteSettingsUpdateRequest. */
  footerProductLinksEnabled?: boolean;
  /** footerQrCodesEnabled field on AdminSiteSettingsUpdateRequest. */
  footerQrCodesEnabled?: boolean;
  /** footerResourceLinksEnabled field on AdminSiteSettingsUpdateRequest. */
  footerResourceLinksEnabled?: boolean;
  /** footerSocialBilibiliEnabled field on AdminSiteSettingsUpdateRequest. */
  footerSocialBilibiliEnabled?: boolean;
  /** footerSocialBilibiliUrl field on AdminSiteSettingsUpdateRequest. */
  footerSocialBilibiliUrl?: string;
  /** footerSocialDiscordEnabled field on AdminSiteSettingsUpdateRequest. */
  footerSocialDiscordEnabled?: boolean;
  /** footerSocialDiscordUrl field on AdminSiteSettingsUpdateRequest. */
  footerSocialDiscordUrl?: string;
  /** footerSocialDouyinEnabled field on AdminSiteSettingsUpdateRequest. */
  footerSocialDouyinEnabled?: boolean;
  /** footerSocialDouyinUrl field on AdminSiteSettingsUpdateRequest. */
  footerSocialDouyinUrl?: string;
  /** footerSocialEmailEnabled field on AdminSiteSettingsUpdateRequest. */
  footerSocialEmailEnabled?: boolean;
  /** footerSocialEmailUrl field on AdminSiteSettingsUpdateRequest. */
  footerSocialEmailUrl?: string;
  /** footerSocialEnabled field on AdminSiteSettingsUpdateRequest. */
  footerSocialEnabled?: boolean;
  /** footerSocialGithubEnabled field on AdminSiteSettingsUpdateRequest. */
  footerSocialGithubEnabled?: boolean;
  /** footerSocialGithubUrl field on AdminSiteSettingsUpdateRequest. */
  footerSocialGithubUrl?: string;
  /** footerSocialLinkedinEnabled field on AdminSiteSettingsUpdateRequest. */
  footerSocialLinkedinEnabled?: boolean;
  /** footerSocialLinkedinUrl field on AdminSiteSettingsUpdateRequest. */
  footerSocialLinkedinUrl?: string;
  /** footerSocialTelegramEnabled field on AdminSiteSettingsUpdateRequest. */
  footerSocialTelegramEnabled?: boolean;
  /** footerSocialTelegramUrl field on AdminSiteSettingsUpdateRequest. */
  footerSocialTelegramUrl?: string;
  /** footerSocialTwitterEnabled field on AdminSiteSettingsUpdateRequest. */
  footerSocialTwitterEnabled?: boolean;
  /** footerSocialTwitterUrl field on AdminSiteSettingsUpdateRequest. */
  footerSocialTwitterUrl?: string;
  /** footerSocialWeiboEnabled field on AdminSiteSettingsUpdateRequest. */
  footerSocialWeiboEnabled?: boolean;
  /** footerSocialWeiboUrl field on AdminSiteSettingsUpdateRequest. */
  footerSocialWeiboUrl?: string;
  /** footerSocialXiaohongshuEnabled field on AdminSiteSettingsUpdateRequest. */
  footerSocialXiaohongshuEnabled?: boolean;
  /** footerSocialXiaohongshuUrl field on AdminSiteSettingsUpdateRequest. */
  footerSocialXiaohongshuUrl?: string;
  /** footerSocialYoutubeEnabled field on AdminSiteSettingsUpdateRequest. */
  footerSocialYoutubeEnabled?: boolean;
  /** footerSocialYoutubeUrl field on AdminSiteSettingsUpdateRequest. */
  footerSocialYoutubeUrl?: string;
  /** footerSocialZhihuEnabled field on AdminSiteSettingsUpdateRequest. */
  footerSocialZhihuEnabled?: boolean;
  /** footerSocialZhihuUrl field on AdminSiteSettingsUpdateRequest. */
  footerSocialZhihuUrl?: string;
  /** homepage field on AdminSiteSettingsUpdateRequest. */
  homepage?: Record<string, JsonValue>;
  /** Icon field on admin site settings update request. */
  icon?: MediaResource;
  /** icpRecordNumber field on AdminSiteSettingsUpdateRequest. */
  icpRecordNumber?: string;
  /** icpRecordUrl field on AdminSiteSettingsUpdateRequest. */
  icpRecordUrl?: string;
  /** Logo field on admin site settings update request. */
  logo?: MediaResource;
  /** Official account qr code field on admin site settings update request. */
  officialAccountQrCode?: MediaResource;
  /** officialAccountQrCodeEnabled field on AdminSiteSettingsUpdateRequest. */
  officialAccountQrCodeEnabled?: boolean;
  /** policeRecordNumber field on AdminSiteSettingsUpdateRequest. */
  policeRecordNumber?: string;
  /** policeRecordUrl field on AdminSiteSettingsUpdateRequest. */
  policeRecordUrl?: string;
  /** privacyUrl field on AdminSiteSettingsUpdateRequest. */
  privacyUrl?: string;
  /** seoDescription field on AdminSiteSettingsUpdateRequest. */
  seoDescription?: string;
  /** seoDescriptionI18n field on AdminSiteSettingsUpdateRequest. */
  seoDescriptionI18n?: Record<string, string>;
  /** seoTitle field on AdminSiteSettingsUpdateRequest. */
  seoTitle?: string;
  /** seoTitleI18n field on AdminSiteSettingsUpdateRequest. */
  seoTitleI18n?: Record<string, string>;
  /** shortName field on AdminSiteSettingsUpdateRequest. */
  shortName?: string;
  /** shortNameI18n field on AdminSiteSettingsUpdateRequest. */
  shortNameI18n?: Record<string, string>;
  /** siteName field on AdminSiteSettingsUpdateRequest. */
  siteName?: string;
  /** siteNameI18n field on AdminSiteSettingsUpdateRequest. */
  siteNameI18n?: Record<string, string>;
  /** supportUrl field on AdminSiteSettingsUpdateRequest. */
  supportUrl?: string;
  /** termsUrl field on AdminSiteSettingsUpdateRequest. */
  termsUrl?: string;
  /** Video channel qr code field on admin site settings update request. */
  videoChannelQrCode?: MediaResource;
  /** videoChannelQrCodeEnabled field on AdminSiteSettingsUpdateRequest. */
  videoChannelQrCodeEnabled?: boolean;
}
