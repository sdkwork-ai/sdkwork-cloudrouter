import { createIamH5RuntimeService, type IamH5RuntimeService } from '@sdkwork/iam-h5-core';
import {
  createSdkworkIamH5AuthController,
  type SdkworkIamH5AuthController,
} from '@sdkwork/iam-h5-auth';
import {
  applyCloudRouterSessionTokens,
  clearCloudRouterSession,
  getCloudRouterTokenManager,
  readCloudRouterSession,
  writeCloudRouterSession,
} from '@sdkwork/cloudrouter-h5-core/session';
import { resolveCloudRouterAppApiBaseUrl } from '@sdkwork/cloudrouter-h5-core/sdk';

import { CREDENTIAL_ENTRY_BOOTSTRAP_GLOBAL } from '../app-auth/appSession.js';

export interface CloudRouterIamAuth {
  readonly controller: SdkworkIamH5AuthController;
  readonly runtime: IamH5RuntimeService;
}

export interface CreateCloudRouterIamAuthOptions {
  /** Invoked after the IAM service committed a successful session. */
  readonly onSessionCommitted?: () => void;
}

/**
 * Reads the platform-injected credential-entry bootstrap Access-Token.
 *
 * The IAM app SDK client needs the application `Access-Token` before a user
 * session exists: the login endpoint identifies the application from it. The
 * Vite credential-entry plugin publishes it as a browser global; when it is
 * absent (e.g. a static preview) the IAM surface fails closed on the server.
 */
function readBootstrapAccessToken(): string | undefined {
  const value = (globalThis as Record<string, unknown>)[CREDENTIAL_ENTRY_BOOTSTRAP_GLOBAL];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

/**
 * Builds the IAM H5 runtime + auth controller over the generated IAM app SDK.
 *
 * This is the single login/session implementation for the H5 surface: the
 * shared `@sdkwork/iam-h5-auth` screens own the credential UI and the
 * `@sdkwork/iam-h5-core` runtime owns the IAM client. The host only bridges the
 * committed IAM session into the CloudRouter session store and shared
 * TokenManager so every CloudRouter SDK client picks up the same dual tokens.
 */
export function createCloudRouterIamAuth(
  options: CreateCloudRouterIamAuthOptions = {},
): CloudRouterIamAuth {
  const session = readCloudRouterSession();
  const resolvedBaseUrl = resolveCloudRouterAppApiBaseUrl();
  const baseUrl = resolvedBaseUrl
    || (typeof window === 'undefined' ? '' : window.location.origin);
  if (!baseUrl) {
    throw new Error('CloudRouter H5 IAM auth requires an app API base URL.');
  }

  const initialAccessToken = session.accessToken ?? readBootstrapAccessToken();
  let runtime: IamH5RuntimeService | null = null;

  runtime = createIamH5RuntimeService({
    baseUrl,
    ...(initialAccessToken ? { accessToken: initialAccessToken } : {}),
    // The IAM service owns sign-out: clear both the CloudRouter session and the
    // shared TokenManager, then drop the IAM client's copy of the token.
    clearSession: () => {
      clearCloudRouterSession();
      getCloudRouterTokenManager().clearTokens();
      runtime?.setAccessToken(undefined);
    },
    // IAM owns authentication; the host only mirrors the committed dual tokens
    // into the stores every CloudRouter SDK client already reads.
    commitSession: (iamSession) => {
      applyCloudRouterSessionTokens(iamSession.accessToken, iamSession.authToken);
      // Keep the account identity on the snapshot so the profile tab can show
      // the signed-in account instead of a generic placeholder.
      const subject = iamSession.user?.id ?? iamSession.sessionId;
      if (subject) {
        writeCloudRouterSession({ ...readCloudRouterSession(), subject });
      }
      runtime?.setAccessToken(iamSession.accessToken);
      options.onSessionCommitted?.();
    },
  });

  return {
    controller: createSdkworkIamH5AuthController(runtime.service),
    runtime,
  };
}
