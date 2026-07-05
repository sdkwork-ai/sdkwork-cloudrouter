import type { IamAppContext } from '@sdkwork/iam-contracts';
import type { IamContextStore, IamRuntime } from '@sdkwork/iam-runtime';
import type { SdkworkAppbasePcAuthSessionBridgeSession } from '@sdkwork/auth-runtime-pc-react/appbasePcAuthSessionBridge';
import {
  loadStoredAppSessionToken,
  storeAppSessionFromResult,
  type StoredAppSessionToken,
} from './app-session-token.ts';
import type { PortalSessionAppContext } from './portal-session-types.ts';

type ClawRouterIamSessionLike = SdkworkAppbasePcAuthSessionBridgeSession & {
  user?: unknown;
  userInfo?: unknown;
  context?: unknown;
  sessionId?: string;
};

export function bindClawRouterIamSessionProjection(runtime: IamRuntime): void {
  const auth = runtime.service.auth;
  wrapIamSessionMethod(auth.registrations, 'create', () => hydrateClawRouterCurrentSession(runtime));
  wrapIamSessionMethod(auth.sessions, 'create', () => hydrateClawRouterCurrentSession(runtime));
  wrapIamSessionMethod(auth.sessions, 'refresh', () => hydrateClawRouterCurrentSession(runtime));
  wrapIamSessionMethod(auth.sessions.current, 'retrieve');
  wrapIamSessionMethod(auth.sessions.current, 'update', () => hydrateClawRouterCurrentSession(runtime));

  const oauth = runtime.service.oauth;
  wrapIamSessionMethod(oauth.deviceAuthorizations, 'create');
  wrapIamSessionMethod(oauth.deviceAuthorizations, 'retrieve');
  wrapIamSessionMethod(
    oauth.deviceAuthorizations.passwordCompletions,
    'create',
    () => hydrateClawRouterCurrentSession(runtime),
  );
  wrapIamSessionMethod(oauth.deviceAuthorizations.scans, 'create');
}

export function patchClawRouterIamContextStore(contextStore: IamContextStore): void {
  if (!contextStore?.clear) {
    return;
  }

  contextStore.clear = async () => {
    const stored = loadStoredAppSessionToken();
    if (!stored?.context) {
      return;
    }

    const nextSession: StoredAppSessionToken = { ...stored };
    delete nextSession.context;
    storeAppSessionFromResult(nextSession);
  };
}

function wrapIamSessionMethod(
  resource: object,
  methodName: string,
  hydrateContext?: () => Promise<void>,
): void {
  const mutableResource = resource as Record<string, unknown>;
  const original = mutableResource[methodName];
  if (typeof original !== 'function') {
    return;
  }

  mutableResource[methodName] = async (...args: unknown[]) => {
    const result = await original.apply(resource, args);
    syncClawRouterIamSession(result as ClawRouterIamSessionLike);
    if (hydrateContext && shouldHydrateClawRouterAppContext(result)) {
      await hydrateContext();
    }
    return augmentIamApiResultWithStoredContext(result as ClawRouterIamSessionLike);
  };
}

async function hydrateClawRouterCurrentSession(runtime: IamRuntime): Promise<void> {
  const stored = loadStoredAppSessionToken();
  if (stored?.context?.tenantId) {
    return;
  }
  await runtime.service.auth.sessions.current.retrieve();
}

function shouldHydrateClawRouterAppContext(value: unknown): boolean {
  const stored = loadStoredAppSessionToken();
  if (stored?.context?.tenantId) {
    return false;
  }
  const sessionLike = value as ClawRouterIamSessionLike | undefined;
  return Boolean(sessionLike?.authToken && sessionLike.accessToken && !sessionLike.context);
}

function syncClawRouterIamSession(iamSession: ClawRouterIamSessionLike): void {
  if (!iamSession.authToken && !iamSession.accessToken && !iamSession.refreshToken) {
    return;
  }
  storeAppSessionFromResult(iamSession);
}

function augmentIamApiResultWithStoredContext(
  apiResult: ClawRouterIamSessionLike,
): ClawRouterIamSessionLike {
  if (readIamContextTenantId(apiResult.context)) {
    return apiResult;
  }

  if (!apiResult.authToken || !apiResult.accessToken) {
    return apiResult;
  }

  const stored = loadStoredAppSessionToken();
  const context = toIamAppContext(stored?.context);
  if (!context) {
    return apiResult;
  }

  return {
    ...apiResult,
    context,
    sessionId: apiResult.sessionId ?? context.sessionId ?? stored?.sessionId,
  };
}

function readIamContextTenantId(context: unknown): string | undefined {
  if (!context || typeof context !== 'object') {
    return undefined;
  }

  const record = context as Record<string, unknown>;
  return normalizeScalar(record.tenantId) ?? normalizeScalar(record.tenant_id);
}

function toIamAppContext(context: PortalSessionAppContext | undefined): IamAppContext | undefined {
  if (!context?.tenantId || !context.userId || !context.sessionId) {
    return undefined;
  }

  return {
    appId: context.appId ?? 'sdkwork-clawrouter',
    authLevel: toIamAuthLevel(context.authLevel),
    dataScope: [...(context.dataScope ?? [])],
    deploymentMode: normalizeIamDeploymentMode(context.deploymentMode),
    environment: toIamEnvironment(context.environment),
    organizationId: context.organizationId,
    permissionScope: [...(context.permissionScope ?? [])],
    sessionId: context.sessionId,
    tenantId: context.tenantId,
    userId: context.userId,
  };
}

function normalizeIamDeploymentMode(value: string | undefined): IamAppContext['deploymentMode'] {
  if (value === 'local' || value === 'standalone') {
    return 'local';
  }
  if (value === 'saas' || value === 'cloud') {
    return 'saas';
  }
  if (value === 'private') {
    return 'private';
  }
  return 'private';
}

function toIamEnvironment(value: string | undefined): IamAppContext['environment'] {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'prod' || normalized === 'production' || normalized === 'staging') {
    return 'prod';
  }
  if (normalized === 'test' || normalized === 'testing') {
    return 'test';
  }
  return 'dev';
}

function toIamAuthLevel(value: string | undefined): IamAppContext['authLevel'] {
  if (value === 'anonymous' || value === 'password' || value === 'mfa' || value === 'system') {
    return value;
  }
  return 'password';
}

function normalizeScalar(value: unknown): string | undefined {
  const normalized = typeof value === 'number' && Number.isFinite(value)
    ? String(value)
    : typeof value === 'string'
      ? value.trim()
      : '';
  return normalized || undefined;
}
