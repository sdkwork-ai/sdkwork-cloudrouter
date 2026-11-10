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

/** Build-time origin of the Deployments app API; empty keeps the bundled catalog. */
const DEPLOYMENTS_BASE_URL = (
  (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
    ?.VITE_DEPLOYMENTS_APP_API_BASE_URL
);

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
 * @param baseUrl - Deployments app API origin.
 * @param catalogKey - Published catalog key.
 * @param fetchImpl - Injected for tests.
 * @returns The catalog document, or `undefined` when it cannot be used.
 */
export async function fetchDeploymentsCatalog(
  baseUrl: string,
  catalogKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<unknown | undefined> {
  const root = baseUrl.trim().replace(/\/+$/u, '');
  if (root === '') return undefined;
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), CATALOG_TIMEOUT_MS);
  try {
    const response = await fetchImpl(
      `${root}/app/v3/api/downloads/catalog/${encodeURIComponent(catalogKey)}`,
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

/** Exposed for the page hook so tests can override the build-time origin. */
export function deploymentsBaseUrl(): string {
  return typeof DEPLOYMENTS_BASE_URL === 'string' ? DEPLOYMENTS_BASE_URL : '';
}
