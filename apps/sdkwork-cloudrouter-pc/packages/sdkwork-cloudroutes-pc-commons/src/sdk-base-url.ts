import {resolveBaseUrlWithAlignProtocol} from '@sdkwork/sdk-common';
import { isBlank, trim } from './sdkwork-utils.ts';
export { resolveBrowserReachableBaseUrl } from './browser-base-url.ts';

function normalizePrefix(prefix: string): string {
  const normalized = trim(prefix).replace(/^\/+|\/+$/g, '');
  return normalized ? `/${normalized}` : '';
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/g, '');
}

/**
 * Reduce a generated SDK base url to its transport root, stripping the
 * sdk-owned API path suffix (e.g. `/app/v3/api`, `/feeds/v3/api`).
 *
 * The generated SDK path helpers (`appApiPath`, `customApiPath`, `aiApiPath`, …)
 * already prepend the canonical API prefix to every request path, so the
 * configured base URL MUST NOT carry that same prefix: keeping it here would
 * define the prefix twice and produce a doubled path such as
 * `/feeds/v3/api/feeds/v3/api/streams/...` (API_SPEC §10, ENVIRONMENT_SPEC §6.3).
 *
 * `@sdkwork/sdk-common`'s `resolveBaseUrl` owns the §6.3 protocol/environment
 * adaptation, and `preservePath: true` keeps any candidate pathname so a gateway
 * mounted on a portal subpath (`https://tenant.example.com/base/app/v3/api`)
 * survives the reduction. Without it the resolver folds every absolute
 * candidate to its bare origin (`toBaseOrigin`) and the portal subpath is
 * silently dropped. Root-relative values (`/feeds/v3/api`) pass through the
 * same-origin branch untouched; the prefix strip below owns both cases, and a
 * base URL that is nothing but the prefix folds to the empty transport root
 * (same-origin).
 */
export function normalizeGeneratedSdkBaseUrl(baseUrl: string, apiPrefix: string): string {
  const aligned = resolveBaseUrlWithAlignProtocol({ baseUrls: [baseUrl], preservePath: true }).url;
  const normalizedPrefix = normalizePrefix(apiPrefix);
  const trimmedBaseUrl = trim(aligned);
  if (isBlank(trimmedBaseUrl) || isBlank(normalizedPrefix)) {
    return trimmedBaseUrl;
  }

  const withoutTrailingSlash = stripTrailingSlash(trimmedBaseUrl);
  if (withoutTrailingSlash === normalizedPrefix) {
    return '';
  }
  if (withoutTrailingSlash.endsWith(normalizedPrefix)) {
    return stripTrailingSlash(withoutTrailingSlash.slice(0, -normalizedPrefix.length));
  }
  return withoutTrailingSlash;
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
