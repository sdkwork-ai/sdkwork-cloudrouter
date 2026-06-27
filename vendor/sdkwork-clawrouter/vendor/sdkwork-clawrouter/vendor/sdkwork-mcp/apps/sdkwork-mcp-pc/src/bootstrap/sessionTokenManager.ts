import { createTokenManager, type AuthTokenManager } from '@sdkwork/sdk-common';

import type { SdkworkMCPPcSessionStore } from './sessionStore';

export function createSdkworkMCPPcSessionTokenManager(
  session: SdkworkMCPPcSessionStore,
): AuthTokenManager {
  const tokenManager = createTokenManager();

  const hydrate = () => {
    const snapshot = session.getSnapshot();
    tokenManager.setTokens({
      accessToken: snapshot.accessToken,
      authToken: snapshot.authToken,
      refreshToken: snapshot.refreshToken,
    });
  };

  hydrate();
  session.subscribe(() => {
    hydrate();
  });

  return tokenManager;
}
