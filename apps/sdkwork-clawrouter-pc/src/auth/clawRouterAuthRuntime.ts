import type { SdkworkIamRuntimeAuthRuntimeLike } from '@sdkwork/auth-pc-react';
import {
  getClawRouterIamRuntime,
  getClawRouterMessagingVerificationService,
} from '@sdkwork/clawroutes-pc-commons/runtime';
import type {
  IamCreateRegistrationInput,
  IamRefreshSessionInput,
} from '@sdkwork/iam-service';

export function getClawRouterAuthRuntime(): SdkworkIamRuntimeAuthRuntimeLike {
  const runtime = getClawRouterIamRuntime();

  return {
    contextStore: runtime.contextStore,
    service: {
      auth: {
        passwordResetRequests: runtime.service.auth.passwordResetRequests,
        passwordResets: runtime.service.auth.passwordResets,
        registrations: {
          create: (body) => runtime.service.auth.registrations.create(
            toIamRegistrationInput(body),
          ),
        },
        sessions: {
          ...runtime.service.auth.sessions,
          refresh: (body) => runtime.service.auth.sessions.refresh(
            toIamRefreshSessionInput(body),
          ),
        },
      },
      iam: runtime.service.iam,
      messaging: getClawRouterMessagingVerificationService(),
      oauth: {
        ...runtime.service.oauth,
        deviceAuthorizations: {
          ...runtime.service.oauth.deviceAuthorizations,
          create: (payload = {}) => runtime.service.oauth.deviceAuthorizations.create(payload),
        },
      },
      system: runtime.service.system,
    },
    tokenStore: runtime.tokenStore,
  };
}

function toIamRegistrationInput(body: Record<string, unknown>): IamCreateRegistrationInput {
  const password = readRequiredString(body, 'password');
  const username = readRequiredString(body, 'username');

  return {
    ...body,
    password,
    username,
  };
}

function toIamRefreshSessionInput(body: Record<string, unknown>): IamRefreshSessionInput {
  const refreshToken = body.refreshToken;
  if (refreshToken === undefined) {
    return {};
  }
  if (typeof refreshToken !== 'string' || !refreshToken.trim()) {
    throw new Error('refreshToken must be a non-empty string');
  }
  return { refreshToken: refreshToken.trim() };
}

function readRequiredString(body: Record<string, unknown>, field: string): string {
  const value = body[field];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value.trim();
}
