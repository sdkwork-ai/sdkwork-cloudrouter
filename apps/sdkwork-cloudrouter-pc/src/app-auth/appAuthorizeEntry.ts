/**
 * Hosted OAuth authorization page for native applications.
 *
 * Native SDKWork applications (the BirdCoder desktop shell, for example) open
 * `<platform>/iam/v3/oauth/authorize` (or the versionless
 * `/iam/oauth/authorize`) in the system browser. Both routes render the same
 * page and keep the request parameters intact. The page creates the pending
 * authorization state through the IAM app-api, renders the IAM login surface in
 * place on that same route, completes the authorization after sign-in, and
 * lands on `/auth/desktop/launch`, which fires the deep link back into the
 * application.
 *
 * Everything in this module is pure so the request contract can be tested
 * without a browser.
 */

import {
  SDKWORK_OAUTH_APP_ALIAS_PATH,
  SDKWORK_OAUTH_APP_AUTHORIZE_PATH,
  SDKWORK_OAUTH_APP_AUTHORIZE_PATHS,
  SDKWORK_OAUTH_APP_AUTHORIZE_VERSIONLESS_PATH,
  SDKWORK_OAUTH_APP_LAUNCH_PATH,
  SDKWORK_OAUTH_AUTHORIZATION_STATE_PARAM,
} from '@sdkwork/auth-pc-react/oauth-app-paths'

/** Authorize path native applications open on the platform origin. */
export const APP_AUTHORIZE_PATH = SDKWORK_OAUTH_APP_AUTHORIZE_PATH
/** Versionless alias of the authorize path; both render the same hosted page. */
export const APP_AUTHORIZE_VERSIONLESS_PATH = SDKWORK_OAUTH_APP_AUTHORIZE_VERSIONLESS_PATH
/** Every authorize path the hosted page answers. */
export const APP_AUTHORIZE_PATHS: readonly string[] = SDKWORK_OAUTH_APP_AUTHORIZE_PATHS
/** Alias entry: the same hosted surface under the auth area. */
export const APP_AUTHORIZE_ALIAS_PATH = SDKWORK_OAUTH_APP_ALIAS_PATH
/** Hand-off page that fires the deep link after authorization completes. */
export const APP_AUTHORIZE_LAUNCH_PATH = SDKWORK_OAUTH_APP_LAUNCH_PATH

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

/** What the hosted OAuth page should do with the current query string. */
export type AppAuthorizeEntryPlan =
  /** A complete authorization request: create the pending state on the backend. */
  | { readonly kind: 'create'; readonly request: AppAuthorizeRequest }
  /** The IAM state already exists; render the hosted login in place on this route. */
  | { readonly kind: 'hosted'; readonly stateId: string }
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
 * Decide what the hosted OAuth page does with one navigation.
 *
 * A browser already carrying the IAM-created authorization state renders the
 * hosted login in place on this route; a full authorization request still has
 * to create that state through the IAM app-api; anything else is reported
 * instead of being bounced into the product home page.
 * @param search - the current location search (with or without a leading `?`).
 * @returns the page plan.
 */
export function planAppAuthorizeEntry(search: string): AppAuthorizeEntryPlan {
  const normalizedSearch = search.startsWith('?') ? search.slice(1) : search
  const params = new URLSearchParams(normalizedSearch)
  const authorizationStateId = readParameter(params, AUTHORIZATION_STATE_PARAM)
  if (authorizationStateId !== undefined) {
    return { kind: 'hosted', stateId: authorizationStateId }
  }
  if (params.toString() === '') {
    return { kind: 'missing-request' }
  }
  const parsed = parseAppAuthorizeRequest(params)
  if (parsed.kind === 'invalid') {
    return { kind: 'invalid', problem: parsed.problem }
  }
  return { kind: 'create', request: parsed.request }
}
