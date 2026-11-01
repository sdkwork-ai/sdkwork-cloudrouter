/**
 * Console and hosted-app session transitions for the H5 renderer.
 *
 * Sign-in and the app-authorization completion share one transport: the
 * generated H5 app SDK client, whose access token comes from the shared token
 * manager. Keeping both transitions here (instead of inside the provider)
 * lets the router's hosted sign-in page run them without the console shell.
 */
import {
  applyCloudRouterSessionTokens,
  getCloudRouterTokenManager,
  readCloudRouterSession,
} from '@sdkwork/cloudrouter-h5-core/session';
import { getCloudRouterH5AppSdkClient } from '@sdkwork/cloudrouter-h5-core/sdk';

import { buildAppSignInBody } from './appSignInBody.js';

/**
 * Browser global the platform's credential-entry bootstrap script publishes.
 *
 * Mirrors `SDKWORK_CREDENTIAL_ENTRY_BOOTSTRAP_ACCESS_TOKEN_GLOBAL_KEY` in
 * `@sdkwork/iam-credential-entry`; the H5 root does not declare that package,
 * and `tests/h5-app-auth-routes.test.mjs` asserts the two names stay equal.
 */
export const CREDENTIAL_ENTRY_BOOTSTRAP_GLOBAL = '__SDKWORK_CREDENTIAL_ENTRY_BOOTSTRAP_ACCESS_TOKEN__';

export interface ConsoleSignInCredentials {
  readonly email: string;
  readonly password: string;
}

interface SessionTokenPair {
  readonly accessToken: string;
  readonly authToken: string;
}

/**
 * Seed the bootstrap Access-Token before a credential-entry call.
 *
 * A login request is not a user session: the platform scopes credential
 * verification with the application bootstrap `Access-Token` it injected into
 * the page (`/__sdkwork/credential-entry-bootstrap.js`), and a request without
 * it is rejected before the credentials are read. The same rule as
 * `initializeCredentialEntryTokenManager` in the canonical package: only an
 * absent token is seeded, and only the access token is set, so no
 * `Authorization` header is sent.
 */
function seedCredentialEntryBootstrapToken(): void {
  const manager = getCloudRouterTokenManager();
  if (manager.hasAccessToken()) return;
  const value = (globalThis as Record<string, unknown>)[CREDENTIAL_ENTRY_BOOTSTRAP_GLOBAL];
  if (typeof value !== 'string') return;
  const token = value.trim();
  if (token !== '') manager.setAccessToken(token);
}

/**
 * Create an app session and install its tokens in the shared token manager.
 * @param credentials - console account credentials.
 * @returns once the session tokens are installed.
 */
export async function signInConsoleSession(credentials: ConsoleSignInCredentials): Promise<void> {
  seedCredentialEntryBootstrapToken();
  const tokens = await requestSessionToken(credentials);
  applyCloudRouterSessionTokens(tokens.accessToken, tokens.authToken);
}

/**
 * Whether the shared session store currently holds an authenticated session.
 * @returns true when both session tokens are present.
 */
export function isConsoleSessionAuthenticated(): boolean {
  return readCloudRouterSession().authenticated;
}

/**
 * Complete the OAuth authorization the hosted entry started for a native app.
 * @param authorizationStateId - state id the IAM authorization server issued.
 * @returns the redirect URL the app's registered callback receives.
 */
export async function completeAppAuthorization(authorizationStateId: string): Promise<string> {
  const client = getCloudRouterH5AppSdkClient();
  const payload = await client.http.request(
    `/oauth/authorizations/${encodeURIComponent(authorizationStateId)}/completions`,
    { method: 'POST', body: {} },
  );
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('The app sign-in completion returned no redirect URL.');
  }
  const redirectUrl = (payload as Record<string, unknown>).redirectUrl;
  if (typeof redirectUrl !== 'string' || redirectUrl.trim() === '') {
    throw new Error('The app sign-in completion returned no redirect URL.');
  }
  return redirectUrl.trim();
}

/**
 * Creates an app session. The generated app SDK exposes IAM user settings but
 * not the session bootstrap endpoint, so the session call goes through the
 * SDK-owned HTTP client to keep headers, base URL, and error handling in one
 * boundary.
 * @param credentials - console account credentials.
 * @returns the session token pair.
 */
async function requestSessionToken(credentials: ConsoleSignInCredentials): Promise<SessionTokenPair> {
  const payload = (await getCloudRouterH5AppSdkClient().http.request('/auth/sessions', {
    method: 'POST',
    body: buildAppSignInBody(credentials),
  })) as Record<string, unknown>;
  const accessToken = typeof payload.accessToken === 'string' ? payload.accessToken : '';
  const authToken = typeof payload.authToken === 'string' ? payload.authToken : '';
  if (!accessToken && !authToken) {
    throw new Error('CloudRouter sign-in returned no session token.');
  }
  return { accessToken, authToken };
}
