/**
 * Hosted app sign-in entry for the H5 surface.
 *
 * The mobile renderer is served from the same platform origins as the PC
 * renderer, so a native SDKWork application that opens
 * `<platform>/iam/v3/oauth/authorize` (or its versionless
 * `/iam/oauth/authorize` alias) may land here on a phone. The entry validates
 * the authorization request, hands the navigation to the IAM authorization
 * server, and (after the hosted login) fires the registered deep link back into
 * the application from `/auth/desktop/launch`.
 *
 * Everything here is pure so the request contract and the hash-entry mapping
 * can be tested without a browser.
 */

/** Authorize path native applications open on the platform origin. */
export const APP_AUTHORIZE_PATH = '/iam/v3/oauth/authorize';
/** Versionless alias of the authorize path; both render the same hosted entry. */
export const APP_AUTHORIZE_VERSIONLESS_PATH = '/iam/oauth/authorize';
/** Every authorize path the hosted entry answers. */
export const APP_AUTHORIZE_PATHS: readonly string[] = Object.freeze([
  APP_AUTHORIZE_PATH,
  APP_AUTHORIZE_VERSIONLESS_PATH,
]);
/**
 * IAM open-api authorize endpoint the entry forwards to.
 *
 * The platform gateway classifies the IAM open-api under `/iam/v3/api`; the
 * versionless path above is the address the application opens on the platform
 * origin, not a gateway route.
 */
export const APP_AUTHORIZE_ENDPOINT_PATH = '/iam/v3/api/oauth/authorize';
/** Alias entry under the auth area. */
export const APP_AUTHORIZE_ALIAS_PATH = '/auth/app';
/** Hosted login page the IAM authorization server returns to. */
export const APP_AUTHORIZE_LOGIN_PATH = '/auth/login';
/** Hand-off page that fires the deep link after authorization completes. */
export const APP_AUTHORIZE_LAUNCH_PATH = '/auth/desktop/launch';
/** IAM H5 OAuth provider callback (WeChat web authorization) hash route. */
export const APP_OAUTH_CALLBACK_PATH = '/auth/oauth/callback';
/** Canonical app-api prefix; its origin also serves the IAM open-api. */
export const APP_API_PREFIX = '/app/v3/api';

/** Query parameter the IAM authorization server hands to the hosted login. */
export const AUTHORIZATION_STATE_PARAM = 'oauthAuthorizationStateId';

/** Paths the H5 hash router must adopt from a real navigation pathname. */
export const APP_AUTH_ENTRY_PATHS: readonly string[] = Object.freeze([
  ...APP_AUTHORIZE_PATHS,
  APP_AUTHORIZE_ALIAS_PATH,
  APP_AUTHORIZE_LOGIN_PATH,
  APP_AUTHORIZE_LAUNCH_PATH,
  APP_OAUTH_CALLBACK_PATH,
]);

const SCOPE_PATTERN = /^[a-z][a-z0-9._-]{0,63}$/u;
const CODE_CHALLENGE_PATTERN = /^[A-Za-z0-9\-._~]{43,128}$/u;
const CLIENT_ID_PATTERN = /^[a-z][a-z0-9._-]{0,127}$/u;
const MAX_STATE_LENGTH = 512;

/** Why a hosted app sign-in request was rejected. */
export type AppAuthorizeRequestProblem =
  | 'missing-parameter'
  | 'invalid-client-id'
  | 'unsupported-response-type'
  | 'invalid-redirect-uri'
  | 'invalid-state'
  | 'unsupported-challenge-method'
  | 'invalid-code-challenge'
  | 'invalid-scope';

/** What the H5 entry should do with the current query string. */
export type AppAuthorizeEntryPlan =
  | { readonly kind: 'forward'; readonly endpoint: string; readonly search: string }
  | { readonly kind: 'hosted-login'; readonly path: string }
  | { readonly kind: 'invalid'; readonly problem: AppAuthorizeRequestProblem }
  | { readonly kind: 'missing-request' };

function readParameter(params: URLSearchParams, name: string): string | undefined {
  const value = params.get(name);
  if (value === null) return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function hasControlCharacters(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

/**
 * Whether a redirect URI can carry an authorization code back to an installed
 * application: a private-use custom scheme or an RFC 8252 loopback HTTP
 * callback, without credentials, query, or fragment.
 * @param value - candidate redirect URI.
 * @returns true when the URI is an acceptable app callback.
 */
export function isAppCallbackRedirectUri(value: string): boolean {
  if (!/^[a-z][a-z0-9+.-]*:\/\//iu.test(value)) return false;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  const scheme = parsed.protocol.toLowerCase();
  if (scheme === 'http:') {
    return parsed.hostname === '127.0.0.1' || parsed.hostname === '[::1]' || parsed.hostname === 'localhost';
  }
  if (!/^[a-z][a-z0-9+.-]*:$/u.test(scheme)) return false;
  if (['https:', 'javascript:', 'data:', 'file:', 'blob:', 'about:'].includes(scheme)) return false;
  return parsed.username === '' && parsed.password === '' && parsed.search === '' && parsed.hash === '';
}

/**
 * Validate one OAuth authorization-code request.
 * @param params - the request's query parameters.
 * @returns `null` when valid, otherwise the first problem found.
 */
export function checkAppAuthorizeRequest(params: URLSearchParams): AppAuthorizeRequestProblem | null {
  const responseType = readParameter(params, 'response_type');
  const clientId = readParameter(params, 'client_id');
  const redirectUri = readParameter(params, 'redirect_uri');
  const state = readParameter(params, 'state');
  const codeChallenge = readParameter(params, 'code_challenge');
  const codeChallengeMethod = readParameter(params, 'code_challenge_method');
  const scope = readParameter(params, 'scope');

  if (
    responseType === undefined || clientId === undefined || redirectUri === undefined
    || state === undefined || codeChallenge === undefined
  ) {
    return 'missing-parameter';
  }
  if (responseType !== 'code') return 'unsupported-response-type';
  if (!CLIENT_ID_PATTERN.test(clientId)) return 'invalid-client-id';
  if (!isAppCallbackRedirectUri(redirectUri)) return 'invalid-redirect-uri';
  if (state.length > MAX_STATE_LENGTH || hasControlCharacters(state)) return 'invalid-state';
  if (codeChallengeMethod !== 'S256') return 'unsupported-challenge-method';
  if (!CODE_CHALLENGE_PATTERN.test(codeChallenge)) return 'invalid-code-challenge';
  const scopeTokens = (scope ?? 'openid profile offline_access').split(/\s+/u).filter(Boolean);
  if (
    scopeTokens.length === 0 || !scopeTokens.includes('openid')
    || scopeTokens.some((token) => !SCOPE_PATTERN.test(token))
  ) {
    return 'invalid-scope';
  }
  return null;
}

/**
 * Resolve the IAM authorization endpoint the entry forwards to.
 * @param appApiBaseUrl - resolved app-api base (absolute or same-origin relative).
 * @param pageOrigin - the browser page origin.
 * @returns the absolute authorize endpoint and whether it leaves the page origin.
 */
export function resolveAppAuthorizeEndpoint(
  appApiBaseUrl: string,
  pageOrigin: string,
): { readonly endpoint: string; readonly crossOrigin: boolean } {
  const trimmed = appApiBaseUrl.trim().replace(/\/+$/u, '');
  const absolute = /^https?:\/\//iu.test(trimmed);
  const apiOrigin = absolute ? new URL(trimmed).origin : pageOrigin;
  return { endpoint: `${apiOrigin}${APP_AUTHORIZE_ENDPOINT_PATH}`, crossOrigin: apiOrigin !== pageOrigin };
}

/**
 * Decide what the H5 entry does with one navigation.
 * @param search - the current location search (with or without a leading `?`).
 * @param options - app-api base and page origin used to resolve the endpoint.
 * @returns the entry plan.
 */
export function planAppAuthorizeEntry(
  search: string,
  options: { readonly appApiBaseUrl: string; readonly pageOrigin: string },
): AppAuthorizeEntryPlan {
  const normalizedSearch = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(normalizedSearch);
  const authorizationStateId = readParameter(params, AUTHORIZATION_STATE_PARAM);
  if (authorizationStateId !== undefined) {
    const loginSearch = new URLSearchParams(normalizedSearch);
    loginSearch.set(AUTHORIZATION_STATE_PARAM, authorizationStateId);
    return { kind: 'hosted-login', path: `${APP_AUTHORIZE_LOGIN_PATH}?${loginSearch.toString()}` };
  }
  if (params.toString() === '') return { kind: 'missing-request' };
  const problem = checkAppAuthorizeRequest(params);
  if (problem !== null) return { kind: 'invalid', problem };
  const { endpoint } = resolveAppAuthorizeEndpoint(options.appApiBaseUrl, options.pageOrigin);
  return { kind: 'forward', endpoint, search: params.toString() };
}

/**
 * Build the URL the entry hands the browser to.
 * @param plan - a `forward` plan.
 * @returns the absolute authorize URL with every original parameter intact.
 */
export function buildAppAuthorizeForwardUrl(
  plan: Extract<AppAuthorizeEntryPlan, { kind: 'forward' }>,
): string {
  return plan.search === '' ? plan.endpoint : `${plan.endpoint}?${plan.search}`;
}

/**
 * Map a real navigation pathname onto an H5 hash route.
 *
 * The H5 renderer routes with `HashRouter`, while the platform serves these
 * entry paths as ordinary pathnames (the application opens `/iam/v3/oauth/authorize`,
 * the IAM server returns to `/auth/login`). The bootstrap adopts such a
 * navigation into the hash router so both URL shapes reach the same page.
 * @param pathname - the real browser pathname.
 * @param search - the real browser search, including its leading `?`.
 * @returns the hash route to adopt, or null when the pathname is not an entry path.
 */
export function resolveAppAuthEntryHash(pathname: string, search: string): string | null {
  const normalized = pathname.replace(/\/+$/u, '') || '/';
  if (!APP_AUTH_ENTRY_PATHS.includes(normalized)) return null;
  return `#${normalized}${search}`;
}

/**
 * Build the hand-off location that carries the deep-link redirect URL.
 * @param redirectUrl - the authorization redirect URL returned by IAM.
 * @returns the router path for the hand-off page.
 */
export function buildAppLaunchPath(redirectUrl: string): string {
  return `${APP_AUTHORIZE_LAUNCH_PATH}?redirectUrl=${encodeURIComponent(redirectUrl)}`;
}

const LOOPBACK_HOSTNAMES = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);

const BLOCKED_LAUNCH_PROTOCOLS = new Set([
  'about',
  'blob',
  'chrome',
  'data',
  'file',
  'javascript',
  'vbscript',
  'view-source',
]);

const MAX_APP_LAUNCH_URL_LENGTH = 4096;

/**
 * True when the launch page may hand the URL to the operating system.
 *
 * The hand-off page reads `redirectUrl` from the query string, so the value is
 * attacker-influenced even though the authorization itself is server-issued.
 * Only native app surfaces (custom scheme) and RFC 8252 loopback redirects are
 * allowed; a web origin or `javascript:`/`data:`/`file:` URL must be refused so
 * the page cannot be used as an open redirect.
 * @param raw - the redirect URL from the query string.
 * @returns whether the URL is a safe app launch target.
 */
export function isSafeAppLaunchUrl(raw: string): boolean {
  const value = raw.trim();
  if (value === '' || value.length > MAX_APP_LAUNCH_URL_LENGTH) return false;
  if (/[\u0000-\u001f\u007f]/u.test(value)) return false;
  if (!/^[a-z][a-z0-9+.-]*:/iu.test(value)) return false;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  const protocol = parsed.protocol.replace(/:$/u, '').toLowerCase();
  if (BLOCKED_LAUNCH_PROTOCOLS.has(protocol)) return false;
  if (protocol === 'http' || protocol === 'https') {
    return LOOPBACK_HOSTNAMES.has(parsed.hostname.toLowerCase());
  }
  return value.includes('://') && parsed.hostname !== '';
}
