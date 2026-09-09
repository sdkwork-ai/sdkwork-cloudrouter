import {resolveBaseUrlWithAlignProtocol} from '@sdkwork/sdk-common';
export { resolveBrowserReachableBaseUrl } from './browser-base-url.ts';

/**
 * Reduce a generated SDK base url to its bare origin, stripping any sdk-owned
 * path suffix (e.g. `/app/v3/api`). Delegates to @sdkwork/sdk-common's
 * resolveBaseUrl normalization, eliminating the self-implemented strip logic.
 */
export function normalizeGeneratedSdkBaseUrl(baseUrl: string, _apiPrefix: string): string {
  return resolveBaseUrlWithAlignProtocol({ baseUrls: [baseUrl] }).url;
}

/**
 * Shared §6.3 dependency-surface fallback (ENVIRONMENT_SPEC.md):
 * resolveBaseUrl matches the unified SDKWORK_API_BASE_URL candidates against
 * the current page host, environment and deployment profile, and derives
 * api[-<env>].<brand> for built cloud pages, the same origin for standalone,
 * and the local dev-server origin / cloud-gateway dev port for pnpm dev
 * pages. The canonical API prefix is re-applied so downstream
 * normalizeGeneratedSdkBaseUrl keeps its contract.
 */
export function resolveSharedDependencySurfaceBaseUrl(apiPrefix: string): string | undefined {
  const origin = resolveBaseUrlWithAlignProtocol().url;
  return origin ? `${origin}${apiPrefix}` : undefined;
}
