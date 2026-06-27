import { createHmac } from 'node:crypto';

const APP_SESSION_CLAIM_TOKEN_VERSION = 'v2';
const SDKWORK_TOKEN_VERSION_CURRENT = 1;
const DEFAULT_SESSION_TTL_SECONDS = 86_400;

const LOCAL_DEV_CONSOLE_PERMISSION = 'clawrouter.console.access';

export const DEFAULT_LOCAL_DEV_APP_SESSION_SUBJECT = Object.freeze({
  tenantId: 100_001,
  organizationId: 0,
  userId: 30,
  appId: 'sdkwork-clawrouter',
  sessionId: 'bootstrap-local-dev',
  environment: 'dev',
  deploymentMode: 'local',
  authLevel: 'password',
  permissionScope: [LOCAL_DEV_CONSOLE_PERMISSION],
});

function sessionDataScope(tenantId, organizationId, userId) {
  const dataScope = [`tenant:${tenantId}`];
  if (organizationId > 0) {
    dataScope.push(`organization:${organizationId}`);
  }
  dataScope.push(`user:${userId}`);
  return dataScope;
}

function signLocalAppSessionToken({
  appSessionSecret,
  tokenKind,
  tenantId = DEFAULT_LOCAL_DEV_APP_SESSION_SUBJECT.tenantId,
  organizationId = DEFAULT_LOCAL_DEV_APP_SESSION_SUBJECT.organizationId,
  userId = DEFAULT_LOCAL_DEV_APP_SESSION_SUBJECT.userId,
  appId = DEFAULT_LOCAL_DEV_APP_SESSION_SUBJECT.appId,
  sessionId = DEFAULT_LOCAL_DEV_APP_SESSION_SUBJECT.sessionId,
  environment = DEFAULT_LOCAL_DEV_APP_SESSION_SUBJECT.environment,
  deploymentMode = DEFAULT_LOCAL_DEV_APP_SESSION_SUBJECT.deploymentMode,
  authLevel = DEFAULT_LOCAL_DEV_APP_SESSION_SUBJECT.authLevel,
  permissionScope = DEFAULT_LOCAL_DEV_APP_SESSION_SUBJECT.permissionScope,
  sessionTtlSeconds = DEFAULT_SESSION_TTL_SECONDS,
  nowUnixSeconds = Math.floor(Date.now() / 1000),
} = {}) {
  const secret = String(appSessionSecret ?? '').trim();
  if (secret.length < 32) {
    throw new Error('SDKWORK_CLAW_APP_SESSION_SECRET must be at least 32 characters');
  }
  if (tokenKind !== 'auth' && tokenKind !== 'access') {
    throw new Error(`unsupported local bootstrap token kind: ${tokenKind}`);
  }

  const issuedAt = nowUnixSeconds + 1;
  const expiresAt = nowUnixSeconds + sessionTtlSeconds + 1;
  const loginScope = organizationId > 0 ? 'ORGANIZATION' : 'TENANT';
  const dataScope = sessionDataScope(tenantId, organizationId, userId);
  const permissionScopeValues = [...permissionScope];
  const claims = {
    tokenKind,
    tenantId,
    organizationId,
    userId,
    sessionId,
    appId,
    loginScope,
    environment,
    deploymentMode,
    authLevel,
    dataScope,
    permissionScope: permissionScopeValues,
    issuedAt,
    expiresAt,
    token_version: SDKWORK_TOKEN_VERSION_CURRENT,
    token_kind: tokenKind,
    tenant_id: String(tenantId),
    organization_id: String(organizationId),
    user_id: String(userId),
    session_id: sessionId,
    app_id: appId,
    login_scope: loginScope,
    deployment_mode: deploymentMode,
    auth_level: authLevel,
    data_scope: dataScope,
    permission_scope: permissionScopeValues,
    iat: issuedAt,
    exp: expiresAt,
  };

  const encodedPayload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signature = createHmac('sha256', secret).update(encodedPayload).digest('hex');
  return `${APP_SESSION_CLAIM_TOKEN_VERSION}.${encodedPayload}.${signature}`;
}

export function signLocalAppSessionAccessToken(params = {}) {
  return signLocalAppSessionToken({ ...params, tokenKind: 'access' });
}

export function signLocalAppSessionAuthToken(params = {}) {
  return signLocalAppSessionToken({ ...params, tokenKind: 'auth' });
}

export { SDKWORK_TOKEN_VERSION_CURRENT };

function isLocalBootstrapTokenCompliant(token, expectedTokenKind) {
  const normalized = String(token ?? '').trim();
  if (!normalized.startsWith('v2.')) {
    return false;
  }
  const encodedPayload = normalized.split('.')[1];
  if (!encodedPayload) {
    return false;
  }
  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    return payload.token_version === SDKWORK_TOKEN_VERSION_CURRENT
      && payload.token_kind === expectedTokenKind
      && typeof payload.tenant_id === 'string'
      && payload.tenant_id.length > 0
      && typeof payload.app_id === 'string'
      && payload.app_id.length > 0
      && typeof payload.user_id === 'string'
      && payload.user_id.length > 0;
  } catch {
    return false;
  }
}

export function isLocalBootstrapAccessTokenCompliant(token) {
  return isLocalBootstrapTokenCompliant(token, 'access');
}

export function isLocalBootstrapAuthTokenCompliant(token) {
  return isLocalBootstrapTokenCompliant(token, 'auth');
}
