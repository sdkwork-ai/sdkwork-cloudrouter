import {resolveBaseUrlWithAlignProtocol} from '@sdkwork/sdk-common';
import { isBlank, trim } from './sdkwork-utils.ts';
import { readCloudRouterRuntimeEnv } from './utils/env.ts';
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
 * Authored canonical surface base per canonical API prefix
 * (BROWSER_RUNTIME_ENV_SPEC.md §5.1: the runtime document authors these and the
 * composition root MUST NOT re-derive them).
 */
const AUTHORED_SURFACE_BASE_ENV_KEYS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  '/app/v3/api': ['VITE_CLOUDROUTER_APP_API_BASE_URL'],
  '/backend/v3/api': ['VITE_CLOUDROUTER_BACKEND_API_BASE_URL'],
  '/v1': ['VITE_CLOUDROUTER_OPEN_API_BASE_URL'],
});

function readAuthoredSurfaceBaseUrl(apiPrefix: string): string | undefined {
  for (const key of AUTHORED_SURFACE_BASE_ENV_KEYS[apiPrefix] ?? []) {
    const value = trim(readCloudRouterRuntimeEnv(key) ?? '');
    if (!isBlank(value)) {
      return value;
    }
  }
  return undefined;
}

/**
 * Normalize an authored base into the dependency surface URL a generated SDK
 * transport expects.
 *
 * - Same-origin RELATIVE prefix (`/app/v3/api`, or `/` in the standalone
 *   build document): the page origin fronts the canonical prefix, so the
 *   result is the local relative prefix and host/port derivation never runs.
 * - Absolute deployment value (single origin, or the `;`-joined multi-domain
 *   family declared by `etc/browser/runtime-env.cloud.*.json`): select the
 *   family member matching the current page (ENVIRONMENT_SPEC.md §5.1.0.1,
 *   §6.3). A page no declared candidate matches keeps the PRIMARY declared
 *   origin — never a fabricated gateway dev port.
 */
function resolveAuthoredSurfaceBase(
  authoredValue: string,
  normalizedPrefix: string,
): string | undefined {
  const trimmedValue = trim(authoredValue);
  if (!trimmedValue) {
    return undefined;
  }
  // `'/app/v3/api'`, `'/'` (standalone build document) and root-relative mount
  // paths all mean "the page origin fronts the canonical prefix".
  if (trimmedValue.startsWith('/')) {
    return normalizedPrefix || undefined;
  }
  const trimmed = stripTrailingSlash(trimmedValue);
  const resolution = resolveBaseUrlWithAlignProtocol({ baseUrls: [trimmed] });
  const resolved = stripTrailingSlash(resolution.url);
  if (resolved && !resolved.startsWith('/') && resolution.reason !== 'derived-from-host') {
    return `${resolved}${normalizedPrefix}`;
  }
  const [primary] = trimmed
    .split(/[,;]/u)
    .map((candidate) => stripTrailingSlash(candidate.trim()))
    .filter((candidate) => /^[a-z][a-z\d+\-.]*:\/\//iu.test(candidate));
  return primary ? `${primary}${normalizedPrefix}` : undefined;
}

/**
 * Dependency-surface base URL (ENVIRONMENT_SPEC.md §6.3,
 * BROWSER_RUNTIME_ENV_SPEC.md §5.1/§5.2).
 *
 * The runtime document's authored canonical surface base wins: dev documents
 * carry the same-origin relative prefix, build documents the deployment family
 * URL. Only a document that does not author the key falls back to the shared
 * `SDKWORK_API_BASE_URL` / `VITE_API_BASE_URL` origin, and a relative shared
 * base keeps the same-origin prefix.
 *
 * `resolveBaseUrl()` is deliberately NOT called without candidates and allowed
 * to derive: on a local page it produces `<host>:3910` (sdk-common's
 * cloud-gateway dev port), a cross-origin loopback the dev ingress never serves
 * — the regression that made IAM/auth startup calls fail with
 * `ERR_CONNECTION_REFUSED` under `pnpm dev:cloud`.
 */
export function resolveSharedDependencySurfaceBaseUrl(apiPrefix: string): string | undefined {
  const normalizedPrefix = normalizePrefix(apiPrefix);
  const authored = readAuthoredSurfaceBaseUrl(normalizedPrefix);
  if (authored) {
    return resolveAuthoredSurfaceBase(authored, normalizedPrefix) ?? (normalizedPrefix || undefined);
  }

  const sharedBase = trim(readCloudRouterRuntimeEnv('SDKWORK_API_BASE_URL') ?? '')
    || trim(readCloudRouterRuntimeEnv('VITE_API_BASE_URL') ?? '');
  if (!sharedBase) {
    return normalizedPrefix || undefined;
  }
  return resolveAuthoredSurfaceBase(sharedBase, normalizedPrefix) ?? (normalizedPrefix || undefined);
}
