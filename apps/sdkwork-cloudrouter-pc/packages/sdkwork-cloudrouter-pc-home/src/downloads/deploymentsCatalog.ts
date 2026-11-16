/**
 * Reads the Deployments-hosted download catalog for a site that stores only a
 * pointer (`{ "catalogKey": "..." }`) in its own settings.
 *
 * The fetch is anonymous and fail-open: no configured base URL, a rejected
 * request or an unexpected payload all return `undefined`, which keeps the
 * bundled catalog rendering exactly as before the migration. Only a resolved
 * pointer triggers a request, so a deployment that never adopted Deployments
 * makes no call at all.
 */

import {
  APP_API_PREFIX,
  readCloudRouterRuntimeEnv,
  resolveCanonicalDependencySurfaceBaseUrl,
} from '@sdkwork/cloudroutes-pc-commons/runtime';

/**
 * Build-time fallback for the Deployments app API root.
 *
 * The runtime document (`window.__CLOUDROUTER_ENV__`) wins, because that is how every other
 * sibling API origin reaches this app in dev and in cloud builds; the build-time variables stay as
 * a fallback for deployments that already inject the origin through Vite.
 */
const BUILD_TIME_DEPLOYMENTS_BASE_URL = readBuildTimeEnv('VITE_SDKWORK_DEPLOYMENTS_APP_API_BASE_URL')
  ?? readBuildTimeEnv('VITE_DEPLOYMENTS_APP_API_BASE_URL');

function readBuildTimeEnv(name: string): string | undefined {
  const value = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.[name];
  return typeof value === 'string' ? value : undefined;
}

/** Bounded wait, in milliseconds, for one catalog request. */
const CATALOG_TIMEOUT_MS = 5_000;

/**
 * @param value - Stored `downloads` site-settings document.
 * @returns The catalog key when the document is a pointer.
 */
export function readDownloadsPointer(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const key = (value as { catalogKey?: unknown }).catalogKey;
  return typeof key === 'string' && key.trim() !== '' ? key.trim() : undefined;
}

/**
 * Fetches one published catalog.
 * @param baseUrl - Deployments app API origin (or its `/app/v3/api` surface URL).
 * @param catalogKey - Published catalog key.
 * @param fetchImpl - Injected for tests.
 * @returns The catalog document, or `undefined` when it cannot be used.
 */
export async function fetchDeploymentsCatalog(
  baseUrl: string,
  catalogKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<unknown | undefined> {
  const root = deploymentsOrigin(baseUrl);
  if (root === '') return undefined;
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), CATALOG_TIMEOUT_MS);
  try {
    const response = await fetchImpl(
      `${root}${APP_API_PREFIX}/downloads/catalog/${encodeURIComponent(catalogKey)}`,
      { signal: controller.signal, headers: { accept: 'application/json' } },
    );
    if (!response.ok) return undefined;
    const payload: unknown = await response.json();
    return typeof payload === 'object' && payload !== null
      ? (payload as { data?: unknown }).data
      : undefined;
  } catch {
    return undefined;
  } finally {
    clearTimeout(deadline);
  }
}

/**
 * Reduces a configured Deployments app API value to the origin the request is built on.
 *
 * Both authored shapes reach this module — a bare origin, and the canonical dependency-surface
 * URL that ends with `/app/v3/api` — plus the `;`-joined domain family a cloud build authors. The
 * shared resolver owns family selection and loopback rebinding, and the request path already
 * carries the API prefix once, so the surface suffix is stripped here.
 *
 * @param baseUrl - Configured value.
 * @returns The origin root, or `''` when nothing usable is configured.
 */
export function deploymentsOrigin(baseUrl: string): string {
  let surface: string | undefined;
  try {
    surface = resolveCanonicalDependencySurfaceBaseUrl(baseUrl, APP_API_PREFIX);
  } catch {
    // A malformed authored value must degrade to "not configured", the same fail-open rule the
    // request itself follows; throwing here would escape the fetch's own guard.
    return '';
  }
  if (surface === undefined || !surface.endsWith(APP_API_PREFIX)) {
    return '';
  }
  return surface.slice(0, -APP_API_PREFIX.length).replace(/\/+$/u, '');
}

/** Exposed for the page hook so tests can override the build-time origin. */
export function deploymentsBaseUrl(): string {
  return readCloudRouterRuntimeEnv('VITE_SDKWORK_DEPLOYMENTS_APP_API_BASE_URL')
    ?? readCloudRouterRuntimeEnv('VITE_DEPLOYMENTS_APP_API_BASE_URL')
    ?? (typeof BUILD_TIME_DEPLOYMENTS_BASE_URL === 'string' ? BUILD_TIME_DEPLOYMENTS_BASE_URL : '');
}
