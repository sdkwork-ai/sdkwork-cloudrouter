import { useEffect, useState } from 'react';
import { ensureSdkworkApiSuccess, readApiRecord, readString, type ApiRecord } from './api-result.ts';
import { FOOTER_SECTIONS, type FooterSectionVisibility } from './footer-sections.ts';
import { readMediaResource, readMediaResourceUrl, type CloudRouterMediaResource } from './media-resource.ts';
import { getCloudRouterAppSdkClient } from './sdk-clients.ts';
import { resolveSdkworkSdkLocale } from './sdk-locale.ts';
import {
  SOCIAL_PLATFORMS,
  createDefaultSocialPlatformLinks,
  socialPlatformFieldNames,
  type SocialPlatformLinks,
} from './social-platforms.ts';

export interface SiteBranding {
  siteName: string;
  shortName: string;
  description: string;
  logo?: CloudRouterMediaResource;
  icon?: CloudRouterMediaResource;
  favicon?: CloudRouterMediaResource;
  officialAccountQrCode?: CloudRouterMediaResource;
  communityGroupQrCode?: CloudRouterMediaResource;
  videoChannelQrCode?: CloudRouterMediaResource;
  douyinQrCode?: CloudRouterMediaResource;
  /** Per-channel footer visibility. Operators flip these in `/admin/site`. */
  officialAccountQrCodeEnabled: boolean;
  communityGroupQrCodeEnabled: boolean;
  videoChannelQrCodeEnabled: boolean;
  douyinQrCodeEnabled: boolean;
  /**
   * Which footer regions render at all. Operators flip these per region in `/admin/site`, which is
   * what makes the footer composable instead of a fixed layout.
   */
  footerSections: FooterSectionVisibility;
  /**
   * Follow-us row configuration, one entry per registry platform. A platform with `enabled: false`
   * keeps its URL so switching it back on does not lose the operator's input.
   */
  socialLinks: SocialPlatformLinks;
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
  /**
   * Homepage copy published from `/admin/site`, as authored — an empty object when nothing was
   * configured. Kept raw rather than normalised here because the homepage package owns the shape
   * and its fallback rules; this layer only carries the payload through the single runtime fetch.
   */
  homepage: ApiRecord;
  /**
   * Download catalog published from `/admin/site`, as authored — an empty object when nothing was
   * configured, which the download section reads as "keep the catalog checked into the repository".
   */
  downloads: ApiRecord;
}

/**
 * Defaults come from the platform registry rather than being restated here, so the footer's
 * fallback and the admin form's initial value are the same numbers by construction.
 */
export function createDefaultSocialLinks(): SocialPlatformLinks {
  return createDefaultSocialPlatformLinks();
}

function createDefaultFooterSections(): FooterSectionVisibility {
  return Object.fromEntries(FOOTER_SECTIONS.map((section) => [section.code, true])) as FooterSectionVisibility;
}

export const DEFAULT_SITE_BRANDING: SiteBranding = {
  siteName: 'Cloud Router',
  shortName: 'Cloud Router',
  description: 'Unified AI gateway and model routing platform.',
  logo: undefined,
  icon: undefined,
  favicon: undefined,
  officialAccountQrCode: undefined,
  communityGroupQrCode: undefined,
  videoChannelQrCode: undefined,
  douyinQrCode: undefined,
  officialAccountQrCodeEnabled: true,
  communityGroupQrCodeEnabled: true,
  videoChannelQrCodeEnabled: true,
  douyinQrCodeEnabled: true,
  footerSections: createDefaultFooterSections(),
  socialLinks: createDefaultSocialLinks(),
  brandColor: '#0f172a',
  accentColor: '#e9583f',
  footerCopyright: 'Cloud Router. All rights reserved.',
  icpRecordNumber: `${String.fromCharCode(0x4eac)}ICP${String.fromCharCode(0x5907)}2026000000${String.fromCharCode(0x53f7)}-1`,
  icpRecordUrl: 'https://beian.miit.gov.cn/',
  policeRecordNumber: `${String.fromCharCode(0x4eac)}${String.fromCharCode(0x516c)}${String.fromCharCode(0x7f51)}${String.fromCharCode(0x5b89)}${String.fromCharCode(0x5907)}11010502000000${String.fromCharCode(0x53f7)}`,
  policeRecordUrl: 'https://www.beian.gov.cn/portal/registerSystemInfo?recordcode=11010502000000',
  seoTitle: 'Cloud Router',
  seoDescription: 'Unified AI gateway and model routing platform.',
  supportUrl: '',
  docsUrl: '/docs',
  privacyUrl: '/privacy',
  termsUrl: '/terms',
  customCss: '',
  homepage: {},
  downloads: {},
};

const SITE_BRANDING_EVENT = 'sdkwork-cloudrouter-site-branding-change';
const CUSTOM_CSS_ELEMENT_ID = 'sdkwork-cloudrouter-site-custom-css';
let cachedSiteBranding: SiteBranding | null = null;
/**
 * Whether `cachedSiteBranding` came from a completed runtime read.
 *
 * A snapshot reused from browser storage — or the placeholder published after a failed read — is
 * deliberately **not** authoritative: it exists to get a branded first paint on screen while the
 * real read runs, so callers must still be allowed to reach the endpoint.
 */
let cachedSiteBrandingIsAuthoritative = false;
/**
 * The locale the cached payload was resolved for.
 *
 * The runtime endpoint resolves every copy field from the negotiated locale (`siteName`,
 * `description`, `seoTitle`, the footer line), so a cached payload belongs to exactly one
 * language: reusing it after a switch would keep the previous language's copy on screen.
 * Recording the locale is what lets the hook tell "the same payload" from "a payload for a
 * different language" without taking a dependency on the i18n runtime.
 */
let cachedSiteBrandingLocale: string | null = null;
let pendingSiteBranding: Promise<SiteBranding> | null = null;
/** The locale of the request currently in flight, so an in-flight fetch is not re-issued. */
let pendingSiteBrandingLocale: string | null = null;

export async function fetchSiteBranding(): Promise<SiteBranding> {
  if (cachedSiteBranding && cachedSiteBrandingIsAuthoritative) {
    return cachedSiteBranding;
  }
  if (pendingSiteBranding) {
    return pendingSiteBranding;
  }
  // Captured before the request goes out: the payload comes back resolved for this locale, and by
  // the time it lands the operator may already have switched language again.
  const requestLocale = resolveSdkworkSdkLocale();

  // A snapshot kept from an earlier navigation in this browser takes the network round-trip off the
  // first paint. It is published immediately but never marked authoritative: the read below always
  // runs, and its change event replaces the snapshot with the operator's current configuration.
  if (!cachedSiteBranding) {
    const stored = readStoredSiteBranding(requestLocale);
    if (stored) {
      cachedSiteBranding = normalizeSiteBranding(stored);
      cachedSiteBrandingLocale = requestLocale;
      applySiteBrandingToDocument(cachedSiteBranding);
      notifySiteBrandingChanged();
    }
  }

  const pending = Promise.resolve()
    .then(() => getCloudRouterAppSdkClient().system.site.runtime.retrieve())
    .then((result) => {
      ensureSdkworkApiSuccess(result, 'Unable to load site branding');
      const record = readApiRecord(result);
      const branding = normalizeSiteBranding(record);
      // A response from a superseded request must not put the previous language back on screen.
      if (pendingSiteBranding === pending) {
        cachedSiteBranding = branding;
        cachedSiteBrandingLocale = requestLocale;
        cachedSiteBrandingIsAuthoritative = true;
        storeSiteBranding(record, requestLocale);
        applySiteBrandingToDocument(branding);
        notifySiteBrandingChanged();
      }
      return branding;
    })
    .catch(() => {
      if (pendingSiteBranding === pending) {
        // A failed read is not the site's branding. Latching the placeholder here would pin the
        // whole session to default copy after one blip, so keep whatever snapshot is on screen and
        // leave the cache non-authoritative: the next read tries the endpoint again.
        if (!cachedSiteBranding) {
          cachedSiteBranding = DEFAULT_SITE_BRANDING;
          cachedSiteBrandingLocale = requestLocale;
          applySiteBrandingToDocument(DEFAULT_SITE_BRANDING);
          notifySiteBrandingChanged();
        }
      }
      return cachedSiteBranding ?? DEFAULT_SITE_BRANDING;
    })
    .finally(() => {
      if (pendingSiteBranding === pending) {
        pendingSiteBranding = null;
        pendingSiteBrandingLocale = null;
      }
    });
  pendingSiteBranding = pending;
  pendingSiteBrandingLocale = requestLocale;
  // A snapshot in hand means the caller can paint now; without one it must await the read, exactly
  // as it did before the snapshot tier existed.
  return cachedSiteBranding ?? pending;
}

export function getCachedSiteBranding(): SiteBranding {
  return cachedSiteBranding ?? DEFAULT_SITE_BRANDING;
}

export function resetSiteBrandingCache(): void {
  cachedSiteBranding = null;
  cachedSiteBrandingLocale = null;
  cachedSiteBrandingIsAuthoritative = false;
  pendingSiteBranding = null;
  pendingSiteBrandingLocale = null;
}

/** The locale the current payload — or the request fetching it — belongs to. */
function activeSiteBrandingLocale(): string | null {
  return pendingSiteBrandingLocale ?? cachedSiteBrandingLocale;
}

export function useSiteBranding(): SiteBranding {
  const [siteBranding, setSiteBranding] = useState<SiteBranding>(() => getCachedSiteBranding());

  useEffect(() => {
    let mounted = true;
    const publish = (branding: SiteBranding) => {
      if (mounted) {
        setSiteBranding(branding);
      }
    };
    void fetchSiteBranding().then(publish);

    const handleChange = () => publish(getCachedSiteBranding());
    globalThis.addEventListener?.(SITE_BRANDING_EVENT, handleChange);
    const stopWatchingLocale = watchSiteBrandingLocale();
    return () => {
      mounted = false;
      globalThis.removeEventListener?.(SITE_BRANDING_EVENT, handleChange);
      stopWatchingLocale();
    };
  }, []);

  return siteBranding;
}

/**
 * Re-reads the branding when the active locale moves.
 *
 * The published copy is resolved server-side from `Accept-Language`, so switching language has to
 * re-fetch rather than re-render. The i18n provider mirrors the active locale onto `<html lang>`
 * (`syncDocumentLanguage`), which is the one signal reachable from this package without importing
 * the i18n runtime; the observer re-reads the locale the SDK would actually send, so a `lang` write
 * that does not change the effective locale is ignored. Each mounted consumer installs its own
 * observer, and the refresh is idempotent: the first one registers the request for the new locale
 * and the rest see it already in flight.
 */
export function watchSiteBrandingLocale(): () => void {
  if (typeof document === 'undefined' || typeof MutationObserver !== 'function') {
    return () => {};
  }
  const observer = new MutationObserver(() => {
    if (resolveSdkworkSdkLocale() === activeSiteBrandingLocale()) {
      return;
    }
    // Drop the payload *and* any request still in flight for the previous locale: committing that
    // response would put the old language back on screen.
    resetSiteBrandingCache();
    void fetchSiteBranding();
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  return () => observer.disconnect();
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
  documentRef.documentElement.style.setProperty('--cloud-router-brand-color', siteBranding.brandColor);
  documentRef.documentElement.style.setProperty('--cloud-router-accent-color', siteBranding.accentColor);
  applyCustomCss(documentRef, siteBranding.customCss);
}

function normalizeSiteBranding(record: ApiRecord): SiteBranding {
  const siteName = readConfiguredString(record, 'siteName', DEFAULT_SITE_BRANDING.siteName).trim()
    || DEFAULT_SITE_BRANDING.siteName;
  const shortName = readConfiguredString(record, 'shortName', siteName).trim() || siteName;
  const description = readConfiguredString(record, 'description', DEFAULT_SITE_BRANDING.description).trim();
  const seoTitle = readConfiguredString(record, 'seoTitle', siteName).trim() || siteName;
  const seoDescription = readConfiguredString(record, 'seoDescription', description).trim() || description;
  // Payloads written before the footer became composable carry no region switches. Every region
  // rendered back then, so defaulting to visible keeps the pre-existing footer intact.
  const footerSections = Object.fromEntries(
    FOOTER_SECTIONS.map((section) => [section.code, readBoolean(record, section.field, true)]),
  ) as FooterSectionVisibility;
  const socialLinks = Object.fromEntries(
    SOCIAL_PLATFORMS.map((platform) => {
      const fields = socialPlatformFieldNames(platform.code);
      const fallback = DEFAULT_SITE_BRANDING.socialLinks[platform.code];
      return [
        platform.code,
        {
          // A missing toggle means the platform was not configurable yet; fall back to the shipped
          // default rather than to `false`, which would silently drop links that already render.
          enabled: readBoolean(record, fields.enabled, fallback.enabled),
          url: readConfiguredLink(record, fields.url, fallback.url),
        },
      ];
    }),
  ) as SocialPlatformLinks;
  return {
    siteName,
    shortName,
    description,
    logo: readMediaResource(record.logo),
    icon: readMediaResource(record.icon),
    favicon: readMediaResource(record.favicon),
    officialAccountQrCode: readMediaResource(record.officialAccountQrCode),
    communityGroupQrCode: readMediaResource(record.communityGroupQrCode),
    videoChannelQrCode: readMediaResource(record.videoChannelQrCode),
    douyinQrCode: readMediaResource(record.douyinQrCode),
    // Payloads written before the toggles existed carry no value; those slots were already
    // rendering whenever an image was configured, so defaulting to visible keeps the
    // pre-existing footer behaviour.
    officialAccountQrCodeEnabled: readBoolean(record, 'officialAccountQrCodeEnabled', true),
    communityGroupQrCodeEnabled: readBoolean(record, 'communityGroupQrCodeEnabled', true),
    videoChannelQrCodeEnabled: readBoolean(record, 'videoChannelQrCodeEnabled', true),
    douyinQrCodeEnabled: readBoolean(record, 'douyinQrCodeEnabled', true),
    footerSections,
    socialLinks,
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
    homepage: readConfiguredRecord(record, 'homepage'),
    downloads: readConfiguredRecord(record, 'downloads'),
  };
}

/**
 * Reads a nested configuration object, defaulting to `{}` for anything that is not a plain object.
 *
 * The homepage and download payloads are structured, not scalar, so `readConfiguredString` does not
 * apply. Returning `{}` rather than `undefined` keeps the consumer's contract simple: "no keys means
 * nothing was published", with no separate absence case to handle.
 */
function readConfiguredRecord(record: ApiRecord, key: string): ApiRecord {
  const value = record[key];
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as ApiRecord) : {};
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

/**
 * Reads an operator-editable follow-us link, where an **empty string is a value** rather than a
 * missing field.
 *
 * `readConfiguredString` deliberately treats blank as absent, which is right for optional copy
 * — but applied to a link it would resurrect the shipped default the moment an operator cleared
 * it: they remove the GitHub link, the footer keeps advertising `github.com/sdkwork-ai`. Only a
 * genuinely absent key falls back, which is what keeps a pre-configuration payload rendering.
 */
function readConfiguredLink(record: ApiRecord, key: string, fallback: string): string {
  const value = record[key];
  return typeof value === 'string' ? value.trim() : fallback;
}

/**
 * Boolean flags are read strictly: only a real boolean counts. A missing or malformed value
 * falls back to `fallback` rather than being coerced from a string, so an operator who
 * disabled a QR slot never sees it silently reappear because of a payload typo.
 */
function readBoolean(record: ApiRecord, key: string, fallback: boolean): boolean {
  const value = record[key];
  return typeof value === 'boolean' ? value : fallback;
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

/**
 * Snapshot store for the last successful runtime read.
 *
 * Why the payload may live in a browser store: it is public site configuration — byte for byte the
 * same document an anonymous visitor receives from the public site-runtime read — so keeping it
 * does not widen what this browser already holds. What it buys is that a reload, a hard navigation,
 * or a link opened into a fresh tab renders branded copy instead of the built-in placeholder while
 * the read is in flight, which also removes those reloads from the endpoint's burst load.
 *
 * What it is not: authoritative. Every boot revalidates, so the stored copy only ever decides the
 * first paint.
 */
const SITE_BRANDING_STORAGE_KEY = 'sdkwork-cloudrouter-site-branding:v1';
/**
 * A snapshot older than this is discarded rather than shown. A tab restored days later would
 * otherwise resurrect copy the operator has long since replaced.
 */
const SITE_BRANDING_STORAGE_MAX_AGE_MILLISECONDS = 24 * 60 * 60 * 1000;

interface StoredSiteBranding {
  locale: string;
  storedAt: number;
  record: ApiRecord;
}

/** `null` in the Node test runtime and in browsers that deny storage (private mode, blocked site data). */
function siteBrandingStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/**
 * Returns the stored payload for `locale`, or `null` when there is nothing usable.
 *
 * The locale match is load-bearing: the endpoint resolves every copy field server-side from
 * `Accept-Language`, so replaying another language's payload would show the previous language's
 * `siteName` and `seoTitle` while the active locale says otherwise.
 */
function readStoredSiteBranding(locale: string): ApiRecord | null {
  const storage = siteBrandingStorage();
  if (!storage) {
    return null;
  }
  try {
    const raw = storage.getItem(SITE_BRANDING_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    const candidate = parsed as Partial<StoredSiteBranding>;
    if (candidate.locale !== locale || typeof candidate.storedAt !== 'number') {
      return null;
    }
    if (Date.now() - candidate.storedAt > SITE_BRANDING_STORAGE_MAX_AGE_MILLISECONDS) {
      return null;
    }
    const record = candidate.record;
    return record && typeof record === 'object' ? record : null;
  } catch {
    // A corrupt or unreadable entry must never break the runtime read.
    return null;
  }
}

/**
 * Stores the raw response record — not the normalised object — so a payload written by an older
 * build is re-shaped by today's `normalizeSiteBranding` instead of being trusted verbatim.
 */
function storeSiteBranding(record: ApiRecord, locale: string): void {
  const storage = siteBrandingStorage();
  if (!storage) {
    return;
  }
  const entry: StoredSiteBranding = { locale, storedAt: Date.now(), record };
  try {
    storage.setItem(SITE_BRANDING_STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // Quota exhausted or storage denied: the in-memory cache still serves this session.
  }
}
