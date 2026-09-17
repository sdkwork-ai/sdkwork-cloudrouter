import { createTokenManager, type AuthTokenManager, type AuthTokens } from '@sdkwork/sdk-common';

import { readCloudRouterSession, writeCloudRouterSession } from './sessionStore.js';

let tokenManager: AuthTokenManager | null = null;

/**
 * Mirrors token state into the host storage adapter so a reload keeps the session
 * without introducing a second token store.
 */
function mirrorTokensToSession(tokens: AuthTokens): void {
  writeCloudRouterSession({
    ...readCloudRouterSession(),
    accessToken: tokens.accessToken ?? null,
    authToken: tokens.authToken ?? null,
  });
}

/**
 * The single global TokenManager for the mini-program root
 * (`APP_SDK_INTEGRATION_SPEC.md` section 4: the same instance is passed to every
 * generated app SDK client).
 *
 * `TokenManagerEvents` only exposes `onTokenSet` / `onTokenRefresh` /
 * `onTokenExpired` / `onTokenCleared` / `onTokenInvalid`; there is no generic
 * change hook.
 */
export function getCloudRouterTokenManager(): AuthTokenManager {
  if (tokenManager) return tokenManager;
  const session = readCloudRouterSession();
  tokenManager = createTokenManager(
    {
      accessToken: session.accessToken ?? undefined,
      authToken: session.authToken ?? undefined,
    },
    {
      onTokenSet: mirrorTokensToSession,
      onTokenRefresh: mirrorTokensToSession,
    },
  );
  return tokenManager;
}

export function resetCloudRouterTokenManager(): void {
  tokenManager = null;
}

export function applyCloudRouterSessionTokens(accessToken: string, authToken: string): void {
  getCloudRouterTokenManager().setTokens({ accessToken, authToken });
  writeCloudRouterSession({
    ...readCloudRouterSession(),
    authenticated: true,
    accessToken,
    authToken,
  });
}
