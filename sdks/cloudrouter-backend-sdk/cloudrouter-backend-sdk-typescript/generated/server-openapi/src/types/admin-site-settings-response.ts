import type { JsonValue } from './json-value';
import type { MediaResource } from './media-resource';

/** AdminSiteSettingsResponse contract. */
export interface AdminSiteSettingsResponse {
  /** accentColor field on AdminSiteSettingsResponse. */
  accentColor: string;
  /** brandColor field on AdminSiteSettingsResponse. */
  brandColor: string;
  /** Community group qr code field on admin site settings response. */
  communityGroupQrCode?: MediaResource;
  /** communityGroupQrCodeEnabled field on AdminSiteSettingsResponse. */
  communityGroupQrCodeEnabled?: boolean;
  /** customCss field on AdminSiteSettingsResponse. */
  customCss: string;
  /** description field on AdminSiteSettingsResponse. */
  description: string;
  /** descriptionI18n field on AdminSiteSettingsResponse. */
  descriptionI18n: Record<string, string>;
  /** docsUrl field on AdminSiteSettingsResponse. */
  docsUrl: string;
  /** Douyin qr code field on admin site settings response. */
  douyinQrCode?: MediaResource;
  /** douyinQrCodeEnabled field on AdminSiteSettingsResponse. */
  douyinQrCodeEnabled?: boolean;
  /** downloads field on AdminSiteSettingsResponse. */
  downloads: Record<string, JsonValue>;
  /** Favicon field on admin site settings response. */
  favicon: MediaResource;
  /** footerBrandEnabled field on AdminSiteSettingsResponse. */
  footerBrandEnabled?: boolean;
  /** footerCompanyLinksEnabled field on AdminSiteSettingsResponse. */
  footerCompanyLinksEnabled?: boolean;
  /** footerCopyright field on AdminSiteSettingsResponse. */
  footerCopyright: string;
  /** footerCopyrightI18n field on AdminSiteSettingsResponse. */
  footerCopyrightI18n: Record<string, string>;
  /** footerLegalEnabled field on AdminSiteSettingsResponse. */
  footerLegalEnabled?: boolean;
  /** footerNewsletterEnabled field on AdminSiteSettingsResponse. */
  footerNewsletterEnabled?: boolean;
  /** footerProductLinksEnabled field on AdminSiteSettingsResponse. */
  footerProductLinksEnabled?: boolean;
  /** footerQrCodesEnabled field on AdminSiteSettingsResponse. */
  footerQrCodesEnabled?: boolean;
  /** footerResourceLinksEnabled field on AdminSiteSettingsResponse. */
  footerResourceLinksEnabled?: boolean;
  /** footerSocialBilibiliEnabled field on AdminSiteSettingsResponse. */
  footerSocialBilibiliEnabled?: boolean;
  /** footerSocialBilibiliUrl field on AdminSiteSettingsResponse. */
  footerSocialBilibiliUrl?: string;
  /** footerSocialDiscordEnabled field on AdminSiteSettingsResponse. */
  footerSocialDiscordEnabled?: boolean;
  /** footerSocialDiscordUrl field on AdminSiteSettingsResponse. */
  footerSocialDiscordUrl?: string;
  /** footerSocialDouyinEnabled field on AdminSiteSettingsResponse. */
  footerSocialDouyinEnabled?: boolean;
  /** footerSocialDouyinUrl field on AdminSiteSettingsResponse. */
  footerSocialDouyinUrl?: string;
  /** footerSocialEmailEnabled field on AdminSiteSettingsResponse. */
  footerSocialEmailEnabled?: boolean;
  /** footerSocialEmailUrl field on AdminSiteSettingsResponse. */
  footerSocialEmailUrl?: string;
  /** footerSocialEnabled field on AdminSiteSettingsResponse. */
  footerSocialEnabled?: boolean;
  /** footerSocialGithubEnabled field on AdminSiteSettingsResponse. */
  footerSocialGithubEnabled?: boolean;
  /** footerSocialGithubUrl field on AdminSiteSettingsResponse. */
  footerSocialGithubUrl?: string;
  /** footerSocialLinkedinEnabled field on AdminSiteSettingsResponse. */
  footerSocialLinkedinEnabled?: boolean;
  /** footerSocialLinkedinUrl field on AdminSiteSettingsResponse. */
  footerSocialLinkedinUrl?: string;
  /** footerSocialTelegramEnabled field on AdminSiteSettingsResponse. */
  footerSocialTelegramEnabled?: boolean;
  /** footerSocialTelegramUrl field on AdminSiteSettingsResponse. */
  footerSocialTelegramUrl?: string;
  /** footerSocialTwitterEnabled field on AdminSiteSettingsResponse. */
  footerSocialTwitterEnabled?: boolean;
  /** footerSocialTwitterUrl field on AdminSiteSettingsResponse. */
  footerSocialTwitterUrl?: string;
  /** footerSocialWeiboEnabled field on AdminSiteSettingsResponse. */
  footerSocialWeiboEnabled?: boolean;
  /** footerSocialWeiboUrl field on AdminSiteSettingsResponse. */
  footerSocialWeiboUrl?: string;
  /** footerSocialXiaohongshuEnabled field on AdminSiteSettingsResponse. */
  footerSocialXiaohongshuEnabled?: boolean;
  /** footerSocialXiaohongshuUrl field on AdminSiteSettingsResponse. */
  footerSocialXiaohongshuUrl?: string;
  /** footerSocialYoutubeEnabled field on AdminSiteSettingsResponse. */
  footerSocialYoutubeEnabled?: boolean;
  /** footerSocialYoutubeUrl field on AdminSiteSettingsResponse. */
  footerSocialYoutubeUrl?: string;
  /** footerSocialZhihuEnabled field on AdminSiteSettingsResponse. */
  footerSocialZhihuEnabled?: boolean;
  /** footerSocialZhihuUrl field on AdminSiteSettingsResponse. */
  footerSocialZhihuUrl?: string;
  /** homepage field on AdminSiteSettingsResponse. */
  homepage: Record<string, JsonValue>;
  /** Icon field on admin site settings response. */
  icon: MediaResource;
  /** icpRecordNumber field on AdminSiteSettingsResponse. */
  icpRecordNumber: string;
  /** icpRecordUrl field on AdminSiteSettingsResponse. */
  icpRecordUrl: string;
  /** Logo field on admin site settings response. */
  logo: MediaResource;
  /** Official account qr code field on admin site settings response. */
  officialAccountQrCode?: MediaResource;
  /** officialAccountQrCodeEnabled field on AdminSiteSettingsResponse. */
  officialAccountQrCodeEnabled?: boolean;
  /** policeRecordNumber field on AdminSiteSettingsResponse. */
  policeRecordNumber: string;
  /** policeRecordUrl field on AdminSiteSettingsResponse. */
  policeRecordUrl: string;
  /** privacyUrl field on AdminSiteSettingsResponse. */
  privacyUrl: string;
  /** seoDescription field on AdminSiteSettingsResponse. */
  seoDescription: string;
  /** seoDescriptionI18n field on AdminSiteSettingsResponse. */
  seoDescriptionI18n: Record<string, string>;
  /** seoTitle field on AdminSiteSettingsResponse. */
  seoTitle: string;
  /** seoTitleI18n field on AdminSiteSettingsResponse. */
  seoTitleI18n: Record<string, string>;
  /** shortName field on AdminSiteSettingsResponse. */
  shortName: string;
  /** shortNameI18n field on AdminSiteSettingsResponse. */
  shortNameI18n: Record<string, string>;
  /** siteName field on AdminSiteSettingsResponse. */
  siteName: string;
  /** siteNameI18n field on AdminSiteSettingsResponse. */
  siteNameI18n: Record<string, string>;
  /** supportUrl field on AdminSiteSettingsResponse. */
  supportUrl: string;
  /** termsUrl field on AdminSiteSettingsResponse. */
  termsUrl: string;
  /** Video channel qr code field on admin site settings response. */
  videoChannelQrCode?: MediaResource;
  /** videoChannelQrCodeEnabled field on AdminSiteSettingsResponse. */
  videoChannelQrCodeEnabled?: boolean;
}
