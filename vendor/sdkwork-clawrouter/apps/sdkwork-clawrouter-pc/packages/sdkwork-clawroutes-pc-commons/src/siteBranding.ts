import { useEffect, useState } from 'react';
import { ensureSdkworkApiSuccess, readApiRecord, readString, type ApiRecord } from './api-result.ts';
import { readMediaResource, readMediaResourceUrl, type ClawRouterMediaResource } from './media-resource.ts';
import { getClawRouterAppSdkClient } from './sdk-clients.ts';

export interface SiteBranding {
  siteName: string;
  shortName: string;
  description: string;
  logo?: ClawRouterMediaResource;
  icon?: ClawRouterMediaResource;
  favicon?: ClawRouterMediaResource;
  brandColor: string;
  accentColor: string;
  footerCopyright: string;
  icpRecordNumber: string;
  icpRecordUrl: string;
  policeRecordNumber: string;
  policeRecordUrl: string;
  seoTitle: string;
  seoDescription: string;
  supportUrl: string;
  docsUrl: string;
  privacyUrl: string;
  termsUrl: string;
  customCss: string;
}

export const DEFAULT_SITE_BRANDING: SiteBranding = {
  siteName: 'Claw Router',
  shortName: 'Claw Router',
  description: 'Unified AI gateway and model routing platform.',
  logo: undefined,
  icon: undefined,
  favicon: undefined,
  brandColor: '#0f172a',
  accentColor: '#e9583f',
  footerCopyright: 'Claw Router. All rights reserved.',
  icpRecordNumber: `${String.fromCharCode(0x4eac)}ICP${String.fromCharCode(0x5907)}2026000000${String.fromCharCode(0x53f7)}-1`,
  icpRecordUrl: 'https://beian.miit.gov.cn/',
  policeRecordNumber: `${String.fromCharCode(0x4eac)}${String.fromCharCode(0x516c)}${String.fromCharCode(0x7f51)}${String.fromCharCode(0x5b89)}${String.fromCharCode(0x5907)}11010502000000${String.fromCharCode(0x53f7)}`,
  policeRecordUrl: 'https://www.beian.gov.cn/portal/registerSystemInfo?recordcode=11010502000000',
  seoTitle: 'Claw Router',
  seoDescription: 'Unified AI gateway and model routing platform.',
  supportUrl: '',
  docsUrl: '/docs',
  privacyUrl: '/privacy',
  termsUrl: '/terms',
  customCss: '',
};

const SITE_BRANDING_EVENT = 'sdkwork-clawrouter-site-branding-change';
const CUSTOM_CSS_ELEMENT_ID = 'sdkwork-clawrouter-site-custom-css';
let cachedSiteBranding: SiteBranding | null = null;
let pendingSiteBranding: Promise<SiteBranding> | null = null;

export async function fetchSiteBranding(): Promise<SiteBranding> {
  if (cachedSiteBranding) {
    return cachedSiteBranding;
  }
  if (pendingSiteBranding) {
    return pendingSiteBranding;
  }
  const appSdkClient = getClawRouterAppSdkClient();
  const sitesRuntime = appSdkClient.sites?.runtime;
  if (!sitesRuntime?.retrieve) {
    pendingSiteBranding = loadDefaultSiteBranding().finally(() => {
      pendingSiteBranding = null;
    });
  } else {
    pendingSiteBranding = sitesRuntime
      .retrieve()
      .then((result) => {
        ensureSdkworkApiSuccess(result, 'Unable to load site branding');
        const branding = normalizeSiteBranding(readApiRecord(result));
        cachedSiteBranding = branding;
        applySiteBrandingToDocument(branding);
        notifySiteBrandingChanged();
        return branding;
      })
      .catch(() => {
        cachedSiteBranding = DEFAULT_SITE_BRANDING;
        applySiteBrandingToDocument(DEFAULT_SITE_BRANDING);
        notifySiteBrandingChanged();
        return DEFAULT_SITE_BRANDING;
      })
      .finally(() => {
        pendingSiteBranding = null;
      });
  }
  return pendingSiteBranding;
}

async function loadDefaultSiteBranding(): Promise<SiteBranding> {
  cachedSiteBranding = DEFAULT_SITE_BRANDING;
  applySiteBrandingToDocument(DEFAULT_SITE_BRANDING);
  notifySiteBrandingChanged();
  return DEFAULT_SITE_BRANDING;
}

export function getCachedSiteBranding(): SiteBranding {
  return cachedSiteBranding ?? DEFAULT_SITE_BRANDING;
}

export function resetSiteBrandingCache(): void {
  cachedSiteBranding = null;
  pendingSiteBranding = null;
}

export function useSiteBranding(): SiteBranding {
  const [siteBranding, setSiteBranding] = useState<SiteBranding>(() => getCachedSiteBranding());

  useEffect(() => {
    let mounted = true;
    fetchSiteBranding().then((branding) => {
      if (mounted) {
        setSiteBranding(branding);
      }
    });

    const handleChange = () => {
      if (mounted) {
        setSiteBranding(getCachedSiteBranding());
      }
    };
    globalThis.addEventListener?.(SITE_BRANDING_EVENT, handleChange);
    return () => {
      mounted = false;
      globalThis.removeEventListener?.(SITE_BRANDING_EVENT, handleChange);
    };
  }, []);

  return siteBranding;
}

export function applySiteBrandingToDocument(siteBranding: SiteBranding): void {
  const documentRef = typeof document === 'undefined' ? null : document;
  if (!documentRef) {
    return;
  }
  const title = siteBranding.seoTitle || siteBranding.siteName;
  if (title) {
    documentRef.title = title;
  }
  setMetaContent(documentRef, 'description', siteBranding.seoDescription || siteBranding.description);
  setFavicon(documentRef, readMediaResourceUrl(siteBranding.favicon) || readMediaResourceUrl(siteBranding.icon) || readMediaResourceUrl(siteBranding.logo));
  documentRef.documentElement.style.setProperty('--claw-router-brand-color', siteBranding.brandColor);
  documentRef.documentElement.style.setProperty('--claw-router-accent-color', siteBranding.accentColor);
  applyCustomCss(documentRef, siteBranding.customCss);
}

function normalizeSiteBranding(record: ApiRecord): SiteBranding {
  const siteName = readConfiguredString(record, 'siteName', DEFAULT_SITE_BRANDING.siteName).trim()
    || DEFAULT_SITE_BRANDING.siteName;
  const shortName = readConfiguredString(record, 'shortName', siteName).trim() || siteName;
  const description = readConfiguredString(record, 'description', DEFAULT_SITE_BRANDING.description).trim();
  const seoTitle = readConfiguredString(record, 'seoTitle', siteName).trim() || siteName;
  const seoDescription = readConfiguredString(record, 'seoDescription', description).trim() || description;
  return {
    siteName,
    shortName,
    description,
    logo: readMediaResource(record.logo),
    icon: readMediaResource(record.icon),
    favicon: readMediaResource(record.favicon),
    brandColor: normalizeColor(readString(record, 'brandColor'), DEFAULT_SITE_BRANDING.brandColor),
    accentColor: normalizeColor(readString(record, 'accentColor'), DEFAULT_SITE_BRANDING.accentColor),
    footerCopyright: readConfiguredString(record, 'footerCopyright', DEFAULT_SITE_BRANDING.footerCopyright).trim()
      || `${siteName}. All rights reserved.`,
    icpRecordNumber: readConfiguredString(record, 'icpRecordNumber', DEFAULT_SITE_BRANDING.icpRecordNumber).trim(),
    icpRecordUrl: readConfiguredString(record, 'icpRecordUrl', DEFAULT_SITE_BRANDING.icpRecordUrl).trim(),
    policeRecordNumber: readConfiguredString(record, 'policeRecordNumber', DEFAULT_SITE_BRANDING.policeRecordNumber).trim(),
    policeRecordUrl: readConfiguredString(record, 'policeRecordUrl', DEFAULT_SITE_BRANDING.policeRecordUrl).trim(),
    seoTitle,
    seoDescription,
    supportUrl: readConfiguredString(record, 'supportUrl').trim(),
    docsUrl: readConfiguredString(record, 'docsUrl', DEFAULT_SITE_BRANDING.docsUrl).trim(),
    privacyUrl: readConfiguredString(record, 'privacyUrl', DEFAULT_SITE_BRANDING.privacyUrl).trim(),
    termsUrl: readConfiguredString(record, 'termsUrl', DEFAULT_SITE_BRANDING.termsUrl).trim(),
    customCss: readConfiguredString(record, 'customCss').trim(),
  };
}

function normalizeColor(value: string, fallback: string): string {
  const normalized = value.trim();
  return /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/iu.test(normalized) ? normalized : fallback;
}

function readConfiguredString(record: ApiRecord, key: string, fallback = ''): string {
  const value = readString(record, key, fallback);
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function setMetaContent(documentRef: Document, name: string, content: string): void {
  let meta = documentRef.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!content) {
    meta?.remove();
    return;
  }
  if (!meta) {
    meta = documentRef.createElement('meta');
    meta.name = name;
    documentRef.head.appendChild(meta);
  }
  meta.content = content;
}

function setFavicon(documentRef: Document, href: string): void {
  if (!href) {
    return;
  }
  let link = documentRef.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = documentRef.createElement('link');
    link.rel = 'icon';
    documentRef.head.appendChild(link);
  }
  link.href = href;
}

function sanitizeCustomCss(css: string): string {
  const trimmed = css.trim();
  if (!trimmed) {
    return '';
  }
  const blockedPatterns = [
    /@import\b/i,
    /javascript:/i,
    /expression\s*\(/i,
    /behavior\s*:/i,
    /-moz-binding/i,
    /url\s*\(\s*["']?\s*data:/i,
  ];
  if (blockedPatterns.some((pattern) => pattern.test(trimmed))) {
    return '';
  }
  return trimmed;
}

function applyCustomCss(documentRef: Document, css: string): void {
  const safeCss = sanitizeCustomCss(css);
  let style = documentRef.getElementById(CUSTOM_CSS_ELEMENT_ID) as HTMLStyleElement | null;
  if (!safeCss) {
    style?.remove();
    return;
  }
  if (!style) {
    style = documentRef.createElement('style');
    style.id = CUSTOM_CSS_ELEMENT_ID;
    documentRef.head.appendChild(style);
  }
  style.textContent = safeCss;
}

function notifySiteBrandingChanged(): void {
  if (typeof CustomEvent === 'function') {
    globalThis.dispatchEvent?.(new CustomEvent(SITE_BRANDING_EVENT));
  }
}
