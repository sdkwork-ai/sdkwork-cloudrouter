import type { JsonValue } from './json-value';
import type { MediaResource } from './media-resource';

/** Site runtime settings response schema exposed by Cloud Router. */
export interface SiteRuntimeSettingsResponse {
  /** Accent color field on site runtime settings response. */
  accentColor: string;
  /** Brand color field on site runtime settings response. */
  brandColor: string;
  /** Community group qr code field on site runtime settings response. */
  communityGroupQrCode?: MediaResource | null;
  /** Community group qr code enabled field on site runtime settings response. */
  communityGroupQrCodeEnabled?: boolean;
  /** Custom css field on site runtime settings response. */
  customCss: string;
  /** Description field on site runtime settings response. */
  description: string;
  /** Description i18n field on site runtime settings response. */
  descriptionI18n: Record<string, string>;
  /** Docs url field on site runtime settings response. */
  docsUrl: string;
  /** Douyin qr code field on site runtime settings response. */
  douyinQrCode?: MediaResource | null;
  /** Douyin qr code enabled field on site runtime settings response. */
  douyinQrCodeEnabled?: boolean;
  /** Downloads field on site runtime settings response. */
  downloads: Record<string, JsonValue>;
  /** Favicon field on site runtime settings response. */
  favicon: MediaResource | null;
  /** Footer brand enabled field on site runtime settings response. */
  footerBrandEnabled?: boolean;
  /** Footer company links enabled field on site runtime settings response. */
  footerCompanyLinksEnabled?: boolean;
  /** Footer copyright field on site runtime settings response. */
  footerCopyright: string;
  /** Footer copyright i18n field on site runtime settings response. */
  footerCopyrightI18n: Record<string, string>;
  /** Footer legal enabled field on site runtime settings response. */
  footerLegalEnabled?: boolean;
  /** Footer newsletter enabled field on site runtime settings response. */
  footerNewsletterEnabled?: boolean;
  /** Footer product links enabled field on site runtime settings response. */
  footerProductLinksEnabled?: boolean;
  /** Footer qr codes enabled field on site runtime settings response. */
  footerQrCodesEnabled?: boolean;
  /** Footer resource links enabled field on site runtime settings response. */
  footerResourceLinksEnabled?: boolean;
  /** Footer social bilibili enabled field on site runtime settings response. */
  footerSocialBilibiliEnabled?: boolean;
  /** Footer social bilibili url field on site runtime settings response. */
  footerSocialBilibiliUrl?: string;
  /** Footer social discord enabled field on site runtime settings response. */
  footerSocialDiscordEnabled?: boolean;
  /** Footer social discord url field on site runtime settings response. */
  footerSocialDiscordUrl?: string;
  /** Footer social douyin enabled field on site runtime settings response. */
  footerSocialDouyinEnabled?: boolean;
  /** Footer social douyin url field on site runtime settings response. */
  footerSocialDouyinUrl?: string;
  /** Footer social email enabled field on site runtime settings response. */
  footerSocialEmailEnabled?: boolean;
  /** Footer social email url field on site runtime settings response. */
  footerSocialEmailUrl?: string;
  /** Footer social enabled field on site runtime settings response. */
  footerSocialEnabled?: boolean;
  /** Footer social github enabled field on site runtime settings response. */
  footerSocialGithubEnabled?: boolean;
  /** Footer social github url field on site runtime settings response. */
  footerSocialGithubUrl?: string;
  /** Footer social linkedin enabled field on site runtime settings response. */
  footerSocialLinkedinEnabled?: boolean;
  /** Footer social linkedin url field on site runtime settings response. */
  footerSocialLinkedinUrl?: string;
  /** Footer social telegram enabled field on site runtime settings response. */
  footerSocialTelegramEnabled?: boolean;
  /** Footer social telegram url field on site runtime settings response. */
  footerSocialTelegramUrl?: string;
  /** Footer social twitter enabled field on site runtime settings response. */
  footerSocialTwitterEnabled?: boolean;
  /** Footer social twitter url field on site runtime settings response. */
  footerSocialTwitterUrl?: string;
  /** Footer social weibo enabled field on site runtime settings response. */
  footerSocialWeiboEnabled?: boolean;
  /** Footer social weibo url field on site runtime settings response. */
  footerSocialWeiboUrl?: string;
  /** Footer social xiaohongshu enabled field on site runtime settings response. */
  footerSocialXiaohongshuEnabled?: boolean;
  /** Footer social xiaohongshu url field on site runtime settings response. */
  footerSocialXiaohongshuUrl?: string;
  /** Footer social youtube enabled field on site runtime settings response. */
  footerSocialYoutubeEnabled?: boolean;
  /** Footer social youtube url field on site runtime settings response. */
  footerSocialYoutubeUrl?: string;
  /** Footer social zhihu enabled field on site runtime settings response. */
  footerSocialZhihuEnabled?: boolean;
  /** Footer social zhihu url field on site runtime settings response. */
  footerSocialZhihuUrl?: string;
  /** Homepage field on site runtime settings response. */
  homepage: Record<string, JsonValue>;
  /** Icon field on site runtime settings response. */
  icon: MediaResource | null;
  /** Icp record number field on site runtime settings response. */
  icpRecordNumber: string;
  /** Icp record url field on site runtime settings response. */
  icpRecordUrl: string;
  /** Logo field on site runtime settings response. */
  logo: MediaResource | null;
  /** Official account qr code field on site runtime settings response. */
  officialAccountQrCode?: MediaResource | null;
  /** Official account qr code enabled field on site runtime settings response. */
  officialAccountQrCodeEnabled?: boolean;
  /** Police record number field on site runtime settings response. */
  policeRecordNumber: string;
  /** Police record url field on site runtime settings response. */
  policeRecordUrl: string;
  /** Privacy url field on site runtime settings response. */
  privacyUrl: string;
  /** Seo description field on site runtime settings response. */
  seoDescription: string;
  /** Seo description i18n field on site runtime settings response. */
  seoDescriptionI18n: Record<string, string>;
  /** Seo title field on site runtime settings response. */
  seoTitle: string;
  /** Seo title i18n field on site runtime settings response. */
  seoTitleI18n: Record<string, string>;
  /** Short name field on site runtime settings response. */
  shortName: string;
  /** Short name i18n field on site runtime settings response. */
  shortNameI18n: Record<string, string>;
  /** Site name field on site runtime settings response. */
  siteName: string;
  /** Site name i18n field on site runtime settings response. */
  siteNameI18n: Record<string, string>;
  /** Support url field on site runtime settings response. */
  supportUrl: string;
  /** Terms url field on site runtime settings response. */
  termsUrl: string;
  /** Video channel qr code field on site runtime settings response. */
  videoChannelQrCode?: MediaResource | null;
  /** Video channel qr code enabled field on site runtime settings response. */
  videoChannelQrCodeEnabled?: boolean;
}
