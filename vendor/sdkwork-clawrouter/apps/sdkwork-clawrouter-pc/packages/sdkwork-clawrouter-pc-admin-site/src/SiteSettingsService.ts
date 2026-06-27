import type { AdminSiteSettingsResponse, AdminSiteSettingsUpdateRequest } from '@sdkwork/clawrouter-backend-sdk';
import {
  ensureSdkworkApiSuccess,
  getClawRouterBackendSdkClient,
  readApiRecord,
  readMediaResource,
  type ClawRouterMediaResource,
} from '@sdkwork/clawroutes-pc-commons/runtime';

export type SiteSettingsForm = Omit<AdminSiteSettingsResponse, 'logo' | 'icon' | 'favicon'> & {
  logo?: ClawRouterMediaResource;
  icon?: ClawRouterMediaResource;
  favicon?: ClawRouterMediaResource;
};

const DEFAULT_ICP_RECORD_NUMBER = `${String.fromCharCode(0x4eac)}ICP${String.fromCharCode(0x5907)}2026000000${String.fromCharCode(0x53f7)}-1`;
const DEFAULT_POLICE_RECORD_NUMBER = `${String.fromCharCode(0x4eac)}${String.fromCharCode(0x516c)}${String.fromCharCode(0x7f51)}${String.fromCharCode(0x5b89)}${String.fromCharCode(0x5907)}11010502000000${String.fromCharCode(0x53f7)}`;

export const DEFAULT_SITE_SETTINGS: SiteSettingsForm = {
  siteName: 'Claw Router',
  shortName: 'Claw Router',
  description: 'Unified AI gateway and model routing platform.',
  logo: undefined,
  icon: undefined,
  favicon: undefined,
  brandColor: '#0f172a',
  accentColor: '#e9583f',
  footerCopyright: 'Claw Router. All rights reserved.',
  icpRecordNumber: DEFAULT_ICP_RECORD_NUMBER,
  icpRecordUrl: 'https://beian.miit.gov.cn/',
  policeRecordNumber: DEFAULT_POLICE_RECORD_NUMBER,
  policeRecordUrl: 'https://www.beian.gov.cn/portal/registerSystemInfo?recordcode=11010502000000',
  seoTitle: 'Claw Router',
  seoDescription: 'Unified AI gateway and model routing platform.',
  supportUrl: '',
  docsUrl: '/docs',
  privacyUrl: '/privacy',
  termsUrl: '/terms',
  customCss: '',
};

export const SiteSettingsService = {
  async fetchSettings(): Promise<SiteSettingsForm> {
    const result = await getClawRouterBackendSdkClient().system.site.settings.retrieve();
    ensureSdkworkApiSuccess(result, 'Unable to load site settings');
    return toSiteSettings(readApiRecord(result));
  },

  async updateSettings(input: SiteSettingsForm): Promise<SiteSettingsForm> {
    const result = await getClawRouterBackendSdkClient().system.site.settings.update(toSiteSettingsUpdateRequest(input));
    ensureSdkworkApiSuccess(result, 'Unable to update site settings');
    return toSiteSettings(readApiRecord(result));
  },
};

export function toSiteSettings(record: Record<string, unknown>): SiteSettingsForm {
  return {
    siteName: readString(record, 'siteName', DEFAULT_SITE_SETTINGS.siteName),
    shortName: readString(record, 'shortName', DEFAULT_SITE_SETTINGS.shortName),
    description: readString(record, 'description', DEFAULT_SITE_SETTINGS.description),
    logo: readMediaResource(record.logo),
    icon: readMediaResource(record.icon),
    favicon: readMediaResource(record.favicon),
    brandColor: readString(record, 'brandColor', DEFAULT_SITE_SETTINGS.brandColor),
    accentColor: readString(record, 'accentColor', DEFAULT_SITE_SETTINGS.accentColor),
    footerCopyright: readString(record, 'footerCopyright', DEFAULT_SITE_SETTINGS.footerCopyright),
    icpRecordNumber: readString(record, 'icpRecordNumber', DEFAULT_SITE_SETTINGS.icpRecordNumber),
    icpRecordUrl: readString(record, 'icpRecordUrl', DEFAULT_SITE_SETTINGS.icpRecordUrl),
    policeRecordNumber: readString(record, 'policeRecordNumber', DEFAULT_SITE_SETTINGS.policeRecordNumber),
    policeRecordUrl: readString(record, 'policeRecordUrl', DEFAULT_SITE_SETTINGS.policeRecordUrl),
    seoTitle: readString(record, 'seoTitle', DEFAULT_SITE_SETTINGS.seoTitle),
    seoDescription: readString(record, 'seoDescription', DEFAULT_SITE_SETTINGS.seoDescription),
    supportUrl: readString(record, 'supportUrl', DEFAULT_SITE_SETTINGS.supportUrl),
    docsUrl: readString(record, 'docsUrl', DEFAULT_SITE_SETTINGS.docsUrl),
    privacyUrl: readString(record, 'privacyUrl', DEFAULT_SITE_SETTINGS.privacyUrl),
    termsUrl: readString(record, 'termsUrl', DEFAULT_SITE_SETTINGS.termsUrl),
    customCss: readString(record, 'customCss', DEFAULT_SITE_SETTINGS.customCss),
  };
}

function readString(record: Record<string, unknown>, key: keyof SiteSettingsForm, fallback = ''): string {
  const value = record[key];
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return fallback;
}

function toSiteSettingsUpdateRequest(form: SiteSettingsForm): AdminSiteSettingsUpdateRequest {
  return {
    siteName: form.siteName,
    shortName: form.shortName,
    description: form.description,
    logo: form.logo,
    icon: form.icon,
    favicon: form.favicon,
    brandColor: form.brandColor,
    accentColor: form.accentColor,
    footerCopyright: form.footerCopyright,
    icpRecordNumber: form.icpRecordNumber,
    icpRecordUrl: form.icpRecordUrl,
    policeRecordNumber: form.policeRecordNumber,
    policeRecordUrl: form.policeRecordUrl,
    seoTitle: form.seoTitle,
    seoDescription: form.seoDescription,
    supportUrl: form.supportUrl,
    docsUrl: form.docsUrl,
    privacyUrl: form.privacyUrl,
    termsUrl: form.termsUrl,
    customCss: form.customCss,
  };
}
