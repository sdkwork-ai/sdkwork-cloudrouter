/**
 * Hosted app sign-in entry for the platform origin.
 *
 * Native SDKWork applications (the BirdCoder desktop shell, for example) open
 * `<platform>/iam/v3/oauth/authorize` in the system browser, complete the web
 * sign-in here, and receive the authorization code back through their
 * registered deep link. The platform is a static browser application, so it
 * cannot mint the authorization state itself: it validates the request and
 * hands the navigation to the IAM authorization server, whose login page then
 * returns to `/auth/login` on this origin. The SDKWork auth page completes the
 * pending authorization and lands on `/auth/desktop/launch`, which fires the
 * deep link back into the application.
 *
 * Everything in this module is pure so the request contract can be tested
 * without a browser.
 */

import {
  SDKWORK_OAUTH_APP_ALIAS_PATH,
  SDKWORK_OAUTH_APP_AUTHORIZE_ENDPOINT_PATH,
  SDKWORK_OAUTH_APP_AUTHORIZE_PATH,
  SDKWORK_OAUTH_APP_AUTHORIZE_PATHS,
  SDKWORK_OAUTH_APP_AUTHORIZE_VERSIONLESS_PATH,
  SDKWORK_OAUTH_APP_LAUNCH_PATH,
  SDKWORK_OAUTH_APP_LOGIN_PATH,
  SDKWORK_OAUTH_AUTHORIZATION_STATE_PARAM,
} from '@sdkwork/auth-pc-react/oauth-app-paths'

/** Authorize path native applications open on the platform origin. */
export const APP_AUTHORIZE_PATH = SDKWORK_OAUTH_APP_AUTHORIZE_PATH
/** Versionless alias of the authorize path; both render the same hosted entry. */
export const APP_AUTHORIZE_VERSIONLESS_PATH = SDKWORK_OAUTH_APP_AUTHORIZE_VERSIONLESS_PATH
/** Every authorize path the hosted entry answers. */
export const APP_AUTHORIZE_PATHS: readonly string[] = SDKWORK_OAUTH_APP_AUTHORIZE_PATHS
/**
 * IAM open-api authorize endpoint the entry forwards to.
 *
 * The platform gateway classifies the IAM open-api under `/iam/v3/api` (the
 * same prefix as `config.dependency_surfaces`), so this registered path is the
 * one a browser can actually reach; the versionless `/iam/v3/oauth/authorize`
 * is the address the application opens on the platform origin, not a gateway
 * route.
 */
export const APP_AUTHORIZE_ENDPOINT_PATH = SDKWORK_OAUTH_APP_AUTHORIZE_ENDPOINT_PATH
/** Alias entry: the same hosted surface under the auth area. */
export const APP_AUTHORIZE_ALIAS_PATH = SDKWORK_OAUTH_APP_ALIAS_PATH
/** Hosted login page the IAM authorization server returns to. */
export const APP_AUTHORIZE_LOGIN_PATH = SDKWORK_OAUTH_APP_LOGIN_PATH
/** Hand-off page that fires the deep link after authorization completes. */
export const APP_AUTHORIZE_LAUNCH_PATH = SDKWORK_OAUTH_APP_LAUNCH_PATH
/** Canonical app-api prefix; its origin also serves the IAM open-api. */
export const APP_API_PREFIX = '/app/v3/api'

/** Query parameter the IAM authorization server hands to the hosted login. */
const AUTHORIZATION_STATE_PARAM = SDKWORK_OAUTH_AUTHORIZATION_STATE_PARAM

/**
 * Scopes the entry accepts. The IAM authorization server owns the registered
 * allow-list per relying party; the entry only rejects values that could not
 * be an OAuth scope token at all.
 */
const SCOPE_PATTERN = /^[a-z][a-z0-9._-]{0,63}$/u
/** PKCE S256 challenge: 43-128 base64url characters. */
const CODE_CHALLENGE_PATTERN = /^[A-Za-z0-9\-._~]{43,128}$/u
/** OAuth client ids are short lower-case slugs. */
const CLIENT_ID_PATTERN = /^[a-z][a-z0-9._-]{0,127}$/u
const MAX_STATE_LENGTH = 512

/** Why a hosted app sign-in request was rejected. */
export type AppAuthorizeRequestProblem =
  | 'missing-parameter'
  | 'invalid-client-id'
  | 'unsupported-response-type'
  | 'invalid-redirect-uri'
  | 'invalid-state'
  | 'unsupported-challenge-method'
  | 'invalid-code-challenge'
  | 'invalid-scope'

/** One validated authorization-code request. */
export interface AppAuthorizeRequest {
  readonly clientId: string
  readonly redirectUri: string
  readonly scope: string
  readonly state: string
  readonly codeChallenge: string
}

/** What the hosted entry should do with the current query string. */
export type AppAuthorizeEntryPlan =
  /** Hand the navigation to the IAM authorization server, keeping every parameter. */
  | { readonly kind: 'forward'; readonly endpoint: string; readonly search: string }
  /** The IAM server already created the authorization state; continue on the hosted login. */
  | { readonly kind: 'hosted-login'; readonly path: string }
  /** The request is not a valid authorization-code request. */
  | { readonly kind: 'invalid'; readonly problem: AppAuthorizeRequestProblem }
  /** No authorization request at all was addressed to the entry. */
  | { readonly kind: 'missing-request' }

/** Result of validating one authorization-code request. */
export type AppAuthorizeRequestParse =
  | { readonly kind: 'valid'; readonly request: AppAuthorizeRequest }
  | { readonly kind: 'invalid'; readonly problem: AppAuthorizeRequestProblem }

function readParameter(params: URLSearchParams, name: string): string | undefined {
  const value = params.get(name)
  if (value === null) return undefined
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

function hasControlCharacters(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0
    if (code < 0x20 || code === 0x7f) return true
  }
  return false
}

/**
 * Whether a redirect URI is an acceptable app callback: a private-use custom
 * scheme, or an RFC 8252 loopback HTTP callback, without credentials, query,
 * or fragment.
 *
 * A public HTTP(S) callback is refused: this entry exists for native
 * applications, and a removable web redirect would put the authorization code
 * on the network instead of handing it to an installed app.
 * @param value - candidate redirect URI.
 * @returns true when the URI can carry an authorization code back to an app.
 */
export function isAppCallbackRedirectUri(value: string): boolean {
  // A deep link is `scheme://authority/path`; an opaque `scheme:path` URI has
  // no authority to compare, so the operating system could not route it.
  if (!/^[a-z][a-z0-9+.-]*:\/\//iu.test(value)) return false
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return false
  }
  const scheme = parsed.protocol.toLowerCase()
  if (scheme === 'http:') {
    return parsed.hostname === '127.0.0.1' || parsed.hostname === '[::1]' || parsed.hostname === 'localhost'
  }
  if (!/^[a-z][a-z0-9+.-]*:$/u.test(scheme)) return false
  if (['https:', 'javascript:', 'data:', 'file:', 'blob:', 'about:'].includes(scheme)) return false
  return parsed.username === '' && parsed.password === '' && parsed.search === '' && parsed.hash === ''
}

/**
 * Validate one OAuth authorization-code request addressed to the hosted entry.
 * @param params - the request's query parameters.
 * @returns the validated request, or the first problem found.
 */
export function parseAppAuthorizeRequest(params: URLSearchParams): AppAuthorizeRequestParse {
  const responseType = readParameter(params, 'response_type')
  const clientId = readParameter(params, 'client_id')
  const redirectUri = readParameter(params, 'redirect_uri')
  const state = readParameter(params, 'state')
  const codeChallenge = readParameter(params, 'code_challenge')
  const codeChallengeMethod = readParameter(params, 'code_challenge_method')
  const scope = readParameter(params, 'scope')

  if (
    responseType === undefined || clientId === undefined || redirectUri === undefined
    || state === undefined || codeChallenge === undefined
  ) {
    return { kind: 'invalid', problem: 'missing-parameter' }
  }
  if (responseType !== 'code') {
    return { kind: 'invalid', problem: 'unsupported-response-type' }
  }
  if (!CLIENT_ID_PATTERN.test(clientId)) {
    return { kind: 'invalid', problem: 'invalid-client-id' }
  }
  if (!isAppCallbackRedirectUri(redirectUri)) {
    return { kind: 'invalid', problem: 'invalid-redirect-uri' }
  }
  if (state.length > MAX_STATE_LENGTH || hasControlCharacters(state)) {
    return { kind: 'invalid', problem: 'invalid-state' }
  }
  if (codeChallengeMethod !== 'S256') {
    // PKCE S256 is mandatory for public clients; a missing or `plain`
    // challenge must never weaken the hand-off.
    return { kind: 'invalid', problem: 'unsupported-challenge-method' }
  }
  if (!CODE_CHALLENGE_PATTERN.test(codeChallenge)) {
    return { kind: 'invalid', problem: 'invalid-code-challenge' }
  }
  const resolvedScope = scope ?? 'openid profile offline_access'
  const scopeTokens = resolvedScope.split(/\s+/u).filter(Boolean)
  if (scopeTokens.length === 0 || !scopeTokens.includes('openid')
    || scopeTokens.some((token) => !SCOPE_PATTERN.test(token))) {
    return { kind: 'invalid', problem: 'invalid-scope' }
  }

  return {
    kind: 'valid',
    request: {
      clientId,
      redirectUri,
      scope: scopeTokens.join(' '),
      state,
      codeChallenge,
    },
  }
}

/**
 * Resolve the IAM authorization endpoint the entry forwards to.
 *
 * The IAM open-api lives on the app-api origin (the generated app SDK and the
 * IAM open-api share the gateway), so a deployment that already reaches its
 * app-api can reach the authorize endpoint without extra configuration. A
 * relative app-api base means the page origin fronts the canonical prefixes:
 * the same-origin endpoint is used and the caller decides whether that can
 * serve the authorize request at all.
 * @param appApiBaseUrl - resolved app-api base (`https://api.example.com[/app/v3/api]` or `/app/v3/api`).
 * @param pageOrigin - the browser page origin.
 * @returns the absolute authorize endpoint and whether it leaves the page origin.
 */
export function resolveAppAuthorizeEndpoint(
  appApiBaseUrl: string,
  pageOrigin: string,
): { readonly endpoint: string; readonly crossOrigin: boolean } {
  const trimmed = appApiBaseUrl.trim().replace(/\/+$/u, '')
  const absolute = /^https?:\/\//iu.test(trimmed)
  const apiOrigin = absolute ? new URL(trimmed).origin : pageOrigin
  return {
    endpoint: `${apiOrigin}${APP_AUTHORIZE_ENDPOINT_PATH}`,
    crossOrigin: apiOrigin !== pageOrigin,
  }
}

/**
 * Decide what the hosted entry does with one navigation.
 *
 * A browser already carrying the IAM-created authorization state continues on
 * the hosted login page; a full authorization request is forwarded to the IAM
 * authorization server; anything else is reported instead of being bounced
 * into the product home page.
 * @param search - the current location search (with or without a leading `?`).
 * @param options - app-api base and page origin used to resolve the endpoint.
 * @returns the entry plan.
 */
export function planAppAuthorizeEntry(
  search: string,
  options: { readonly appApiBaseUrl: string; readonly pageOrigin: string },
): AppAuthorizeEntryPlan {
  const normalizedSearch = search.startsWith('?') ? search.slice(1) : search
  const params = new URLSearchParams(normalizedSearch)
  const authorizationStateId = readParameter(params, AUTHORIZATION_STATE_PARAM)
  if (authorizationStateId !== undefined) {
    const loginSearch = new URLSearchParams(normalizedSearch)
    loginSearch.set(AUTHORIZATION_STATE_PARAM, authorizationStateId)
    return { kind: 'hosted-login', path: `${APP_AUTHORIZE_LOGIN_PATH}?${loginSearch.toString()}` }
  }
  if (params.toString() === '') {
    return { kind: 'missing-request' }
  }
  const parsed = parseAppAuthorizeRequest(params)
  if (parsed.kind === 'invalid') {
    return { kind: 'invalid', problem: parsed.problem }
  }
  const { endpoint } = resolveAppAuthorizeEndpoint(options.appApiBaseUrl, options.pageOrigin)
  return { kind: 'forward', endpoint, search: params.toString() }
}

/**
 * Build the URL the entry hands the browser to.
 * @param plan - a `forward` plan.
 * @returns the absolute authorize URL with every original parameter intact.
 */
export function buildAppAuthorizeForwardUrl(
  plan: Extract<AppAuthorizeEntryPlan, { kind: 'forward' }>,
): string {
  return plan.search === '' ? plan.endpoint : `${plan.endpoint}?${plan.search}`
}
