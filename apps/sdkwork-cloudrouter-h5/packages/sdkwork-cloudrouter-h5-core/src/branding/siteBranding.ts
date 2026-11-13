import { useEffect, useState } from 'react';

import type { SiteRuntimeSettingsResponse } from '@sdkwork/cloudrouter-app-sdk';

import { getCloudRouterH5AppSdkClient } from '../sdk/sdkClients.js';

/**
 * The brand identity the H5 renderer paints in its navbar and home.
 *
 * Values come from the same `system.site.runtime` document the PC portal reads
 * (`/admin/site` is the operator authority), so one published site name/logo
 * applies to every CloudRouter surface. The shipped defaults keep the app
 * branded before the first read lands (and when the read is unavailable, e.g.
 * a static preview without a backend).
 */
export interface H5SiteBranding {
  readonly siteName: string;
  readonly shortName: string;
  readonly description: string;
  readonly seoTitle: string;
  readonly logoUrl?: string;
  readonly brandColor?: string;
  readonly accentColor?: string;
  readonly supportUrl: string;
  readonly docsUrl: string;
  readonly privacyUrl: string;
  readonly termsUrl: string;
}

export const DEFAULT_H5_SITE_BRANDING: H5SiteBranding = {
  siteName: 'CloudRouter',
  shortName: 'CloudRouter',
  description: 'AI 云计算平台',
  seoTitle: 'CloudRouter · AI 云计算平台',
  logoUrl: '/brand/logo.png',
  brandColor: '#0f172a',
  accentColor: '#2563eb',
  supportUrl: 'https://sdkwork.com/support',
  docsUrl: 'https://sdkwork.com/docs',
  privacyUrl: 'https://sdkwork.com/privacy',
  termsUrl: 'https://sdkwork.com/terms',
};

const BRANDING_TIMEOUT_MILLIS = 6000;

let cachedBranding: H5SiteBranding | null = null;
let pendingBranding: Promise<H5SiteBranding> | null = null;
const listeners = new Set<() => void>();

function readConfigured(value: string | null | undefined, fallback: string): string {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed.length > 0 ? trimmed : fallback;
}

function readMediaUrl(media: { url?: string; publicUrl?: string } | null | undefined): string | undefined {
  const url = media?.url ?? media?.publicUrl;
  return typeof url === 'string' && url.trim().length > 0 ? url.trim() : undefined;
}

function normalizeBranding(settings: SiteRuntimeSettingsResponse | null | undefined): H5SiteBranding {
  const siteName = readConfigured(settings?.siteName, DEFAULT_H5_SITE_BRANDING.siteName);
  const shortName = readConfigured(settings?.shortName, siteName);
  const description = readConfigured(settings?.description, DEFAULT_H5_SITE_BRANDING.description);
  return {
    siteName,
    shortName,
    description,
    seoTitle: readConfigured(settings?.seoTitle, `${siteName} · AI 云计算平台`),
    logoUrl: readMediaUrl(settings?.logo),
    brandColor: readConfigured(settings?.brandColor, '#0f172a'),
    accentColor: readConfigured(settings?.accentColor, '#2563eb'),
    supportUrl: readConfigured(settings?.supportUrl, DEFAULT_H5_SITE_BRANDING.supportUrl),
    docsUrl: readConfigured(settings?.docsUrl, DEFAULT_H5_SITE_BRANDING.docsUrl),
    privacyUrl: readConfigured(settings?.privacyUrl, DEFAULT_H5_SITE_BRANDING.privacyUrl),
    termsUrl: readConfigured(settings?.termsUrl, DEFAULT_H5_SITE_BRANDING.termsUrl),
  };
}

function notifyBrandingChanged(): void {
  for (const listener of listeners) {
    listener();
  }
}

/**
 * Fetches the operator-published site branding once per session.
 *
 * The endpoint is public (`skipAuth`) and shared with the PC portal. A failed
 * read keeps the shipped defaults without latching the failure: a later call
 * retries, and a successful read replaces the defaults for every mounted
 * consumer through the change listener.
 */
export function fetchH5SiteBranding(): Promise<H5SiteBranding> {
  if (cachedBranding) {
    return Promise.resolve(cachedBranding);
  }
  if (pendingBranding) {
    return pendingBranding;
  }
  pendingBranding = Promise.resolve()
    .then(() => getCloudRouterH5AppSdkClient().system.site.runtime.retrieve(
      undefined,
      { timeout: BRANDING_TIMEOUT_MILLIS },
    ))
    .then((settings) => {
      cachedBranding = normalizeBranding(settings);
      notifyBrandingChanged();
      return cachedBranding;
    })
    .catch(() => {
      // Do not latch a failed read: the shipped defaults render now, and the
      // next consumer (or the next page load) retries the public endpoint.
      return cachedBranding ?? DEFAULT_H5_SITE_BRANDING;
    })
    .finally(() => {
      pendingBranding = null;
    });
  return pendingBranding;
}

export function getCachedH5SiteBranding(): H5SiteBranding {
  return cachedBranding ?? DEFAULT_H5_SITE_BRANDING;
}

export function resetH5SiteBrandingCache(): void {
  cachedBranding = null;
  pendingBranding = null;
}

/** Subscribe every surface (navbar, home) to one shared branding read. */
export function useH5SiteBranding(): H5SiteBranding {
  const [branding, setBranding] = useState<H5SiteBranding>(() => getCachedH5SiteBranding());

  useEffect(() => {
    let mounted = true;
    const publish = () => {
      if (mounted) {
        setBranding(getCachedH5SiteBranding());
      }
    };
    void fetchH5SiteBranding().then(publish);
    listeners.add(publish);
    return () => {
      mounted = false;
      listeners.delete(publish);
    };
  }, []);

  return branding;
}

/** Apply the configured brand to the document title and CSS custom properties. */
export function applyH5SiteBrandingToDocument(branding: H5SiteBranding): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.title = branding.seoTitle || branding.siteName;
  if (branding.brandColor) {
    document.documentElement.style.setProperty('--cloud-router-brand-color', branding.brandColor);
  }
  if (branding.accentColor) {
    document.documentElement.style.setProperty('--cloud-router-accent-color', branding.accentColor);
  }
}
