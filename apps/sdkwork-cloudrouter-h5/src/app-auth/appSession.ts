/**
 * Hosted app session helpers for the H5 renderer.
 *
 * Sign-in itself is owned by the shared `@sdkwork/iam-h5-auth` screens and the
 * `@sdkwork/iam-h5-core` runtime (`src/bootstrap/iamAuth.ts`). This module keeps
 * only the two transitions that belong to the hosted native-app hand-off:
 * checking whether a session exists and completing the app authorization with
 * the IAM authorization server.
 */
import { readCloudRouterSession } from '@sdkwork/cloudrouter-h5-core/session';
import { getCloudRouterH5AppSdkClient } from '@sdkwork/cloudrouter-h5-core/sdk';

/**
 * Browser global the platform's credential-entry bootstrap script publishes.
 *
 * Mirrors `SDKWORK_CREDENTIAL_ENTRY_BOOTSTRAP_ACCESS_TOKEN_GLOBAL_KEY` in
 * `@sdkwork/iam-credential-entry`; the H5 root does not declare that package,
 * and `tests/h5-app-auth-routes.test.mjs` asserts the two names stay equal.
 * The IAM auth host reads it to seed the IAM app SDK client before login.
 */
export const CREDENTIAL_ENTRY_BOOTSTRAP_GLOBAL = '__SDKWORK_CREDENTIAL_ENTRY_BOOTSTRAP_ACCESS_TOKEN__';

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
