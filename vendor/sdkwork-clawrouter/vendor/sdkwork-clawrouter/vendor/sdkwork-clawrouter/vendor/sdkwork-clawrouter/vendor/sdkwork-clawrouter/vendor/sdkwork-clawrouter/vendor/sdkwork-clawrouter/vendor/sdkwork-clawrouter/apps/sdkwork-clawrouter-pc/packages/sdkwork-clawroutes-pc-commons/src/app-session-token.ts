import { readApiRecord } from './api-result.ts';
import { parseJwtPayload } from './session-jwt-claims.ts';
import { dispatchPortalSessionChange } from './portal-session-events.ts';
import type { PortalIamBridgeSession, PortalSessionAppContext } from './portal-session-types.ts';

const APP_SESSION_STORAGE_KEY = 'sdkwork.clawRouter.appSession.v1';
const EXPIRY_SKEW_SECONDS = 30;

export interface StoredAppSessionToken {
  accessToken: string;
  authToken: string;
  context?: PortalSessionAppContext;
  expiresAt?: number;
  refreshToken?: string;
  sessionId?: string;
  storedAt: number;
}

let memoryToken: StoredAppSessionToken | null = null;
let storageLoaded = false;
const storedAppSessionChangeListeners = new Set<() => void>();

export function subscribeStoredAppSessionChange(listener: () => void): () => void {
  storedAppSessionChangeListeners.add(listener);
  return () => {
    storedAppSessionChangeListeners.delete(listener);
  };
}

export function storeAppSessionFromResult(result: unknown): StoredAppSessionToken {
  const previousToken = loadStoredAppSessionToken();
  const data = readAppSessionPayload(result);
  const accessToken = normalizeSessionToken(readString(data, 'accessToken'));
  const authToken = normalizeSessionToken(readString(data, 'authToken'));
  const expiresAt = readOptionalExpiry(data, 'expiresAt');
  const responseRefreshToken = normalizeSessionToken(readString(data, 'refreshToken'));
  const responseSessionId = readString(data, 'sessionId');
  const sameSession =
    Boolean(previousToken) &&
    (!responseSessionId || previousToken?.sessionId === responseSessionId);
  const refreshToken = responseRefreshToken || (sameSession ? previousToken?.refreshToken ?? '' : '');
  const sessionId = responseSessionId || (sameSession ? previousToken?.sessionId ?? '' : '');

  if (!accessToken || !authToken) {
    throw new Error('App session response is missing valid SDKWork IAM token data');
  }

  const context = readPortalSessionContext(data);

  const stored: StoredAppSessionToken = {
    accessToken,
    authToken,
    ...(context ? { context } : {}),
    ...(Number.isFinite(expiresAt) ? { expiresAt } : {}),
    ...(refreshToken ? { refreshToken } : {}),
    ...(sessionId ? { sessionId } : {}),
    storedAt: currentUnixSeconds(),
  };

  memoryToken = stored;
  storageLoaded = true;
  writeBrowserStorage(stored);
  dispatchPortalSessionChange();
  notifyStoredAppSessionChange();
  return stored;
}

function normalizeSessionToken(value: string): string {
  return value.replace(/^Bearer\s+/i, '').trim();
}

export function getStoredAppSessionToken(now = currentUnixSeconds()): string | undefined {
  return getStoredAppSessionAuthToken(now);
}

export function getStoredAppSessionAuthToken(now = currentUnixSeconds()): string | undefined {
  const token = loadStoredAppSessionToken();
  if (!token) {
    return undefined;
  }
  if (isExpired(token, now)) {
    clearStoredAppSessionToken();
    return undefined;
  }
  return token.authToken;
}

export function getStoredAppSessionAccessToken(now = currentUnixSeconds()): string | undefined {
  const token = loadStoredAppSessionToken();
  if (!token) {
    return undefined;
  }
  if (isExpired(token, now)) {
    clearStoredAppSessionToken();
    return undefined;
  }
  return token.accessToken;
}

export function loadStoredAppSessionToken(): StoredAppSessionToken | null {
  if (memoryToken || storageLoaded) {
    return memoryToken;
  }

  storageLoaded = true;
  const raw = readBrowserStorage();
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isStoredAppSessionToken(parsed)) {
      clearStoredAppSessionToken();
      return null;
    }
    memoryToken = parsed;
    writeBrowserStorage(parsed);
    return parsed;
  } catch {
    clearStoredAppSessionToken();
    return null;
  }
}

export function clearStoredAppSessionToken(): void {
  memoryToken = null;
  storageLoaded = true;
  removeBrowserStorage();
  dispatchPortalSessionChange();
  notifyStoredAppSessionChange();
}

export function toPortalIamBridgeSession(
  token: StoredAppSessionToken | null,
): PortalIamBridgeSession | null {
  if (!token?.authToken && !token?.accessToken && !token?.refreshToken) {
    return null;
  }

  return {
    ...(token.accessToken ? { accessToken: token.accessToken } : {}),
    ...(token.authToken ? { authToken: token.authToken } : {}),
    ...(token.refreshToken ? { refreshToken: token.refreshToken } : {}),
    ...(token.sessionId ? { sessionId: token.sessionId } : {}),
    ...(token.context ? { context: toPortalIamBridgeContext(token.context) } : {}),
  };
}

export function resolveStoredPortalTenantId(token: StoredAppSessionToken | null = loadStoredAppSessionToken()): string | undefined {
  if (!token) {
    return undefined;
  }

  const tenantId = token.context?.tenantId?.trim();
  if (tenantId) {
    return tenantId;
  }

  const claims = parseJwtPayload(token.accessToken);
  if (!claims) {
    return undefined;
  }

  const claimTenantId = readJwtClaimString(claims, 'tenant_id', 'tenantId');
  return claimTenantId ?? undefined;
}

function readAppSessionPayload(result: unknown): Record<string, unknown> {
  return readApiRecord(result);
}

function isExpired(token: StoredAppSessionToken, now: number): boolean {
  if (typeof token.expiresAt !== 'number') {
    return false;
  }
  return token.expiresAt <= now + EXPIRY_SKEW_SECONDS;
}

function isStoredAppSessionToken(value: unknown): value is StoredAppSessionToken {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.accessToken === 'string' &&
    value.accessToken.length > 0 &&
    typeof value.authToken === 'string' &&
    value.authToken.length > 0 &&
    typeof value.storedAt === 'number' &&
    Number.isFinite(value.storedAt) &&
    (value.context === undefined || isPortalSessionAppContext(value.context)) &&
    (value.expiresAt === undefined ||
      (typeof value.expiresAt === 'number' && Number.isFinite(value.expiresAt))) &&
    (value.refreshToken === undefined ||
      (typeof value.refreshToken === 'string' && value.refreshToken.length > 0)) &&
    (value.sessionId === undefined ||
      (typeof value.sessionId === 'string' && value.sessionId.length > 0))
  );
}

function readPortalSessionContext(record: Record<string, unknown>): PortalSessionAppContext | undefined {
  const context = record.context;
  if (!isRecord(context)) {
    return undefined;
  }

  const tenantId = readString(context, 'tenantId');
  const userId = readString(context, 'userId');
  const sessionId = readString(context, 'sessionId');
  if (!tenantId || !userId || !sessionId) {
    return undefined;
  }

  const organizationId = readString(context, 'organizationId');
  const appId = readString(context, 'appId');
  const environment = readString(context, 'environment');
  const deploymentMode = readString(context, 'deploymentMode');
  const authLevel = readString(context, 'authLevel');
  const dataScope = readStringArray(context.dataScope);
  const permissionScope = readStringArray(context.permissionScope);

  return {
    tenantId,
    userId,
    sessionId,
    ...(organizationId ? { organizationId } : {}),
    ...(appId ? { appId } : {}),
    ...(environment ? { environment } : {}),
    ...(deploymentMode ? { deploymentMode } : {}),
    ...(authLevel ? { authLevel } : {}),
    ...(dataScope ? { dataScope } : {}),
    ...(permissionScope ? { permissionScope } : {}),
  };
}

function isPortalSessionAppContext(value: unknown): value is PortalSessionAppContext {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.tenantId === 'string' &&
    value.tenantId.length > 0 &&
    typeof value.userId === 'string' &&
    value.userId.length > 0
  );
}

function toPortalIamBridgeContext(context: PortalSessionAppContext): PortalIamBridgeSession['context'] {
  return {
    appId: context.appId ?? 'sdkwork-clawrouter',
    authLevel: toIamAuthLevel(context.authLevel),
    dataScope: [...(context.dataScope ?? [])],
    deploymentMode: normalizeIamDeploymentMode(context.deploymentMode),
    environment: toIamEnvironment(context.environment),
    organizationId: context.organizationId,
    permissionScope: [...(context.permissionScope ?? [])],
    sessionId: context.sessionId ?? '',
    tenantId: context.tenantId,
    userId: context.userId,
  };
}

function normalizeIamDeploymentMode(value: string | undefined): 'local' | 'private' | 'saas' {
  if (value === 'local' || value === 'standalone') {
    return 'local';
  }
  if (value === 'saas' || value === 'cloud') {
    return 'saas';
  }
  return 'private';
}

function toIamEnvironment(value: string | undefined): 'dev' | 'prod' | 'test' {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'prod' || normalized === 'production' || normalized === 'staging') {
    return 'prod';
  }
  if (normalized === 'test' || normalized === 'testing') {
    return 'test';
  }
  return 'dev';
}

function toIamAuthLevel(value: string | undefined): 'anonymous' | 'password' | 'mfa' | 'system' {
  if (value === 'anonymous' || value === 'password' || value === 'mfa' || value === 'system') {
    return value;
  }
  return 'password';
}

function readStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const items = value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0);
  return items.length > 0 ? items : undefined;
}

function readJwtClaimString(claims: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = String(claims[key] ?? '').trim();
    if (value) {
      return value;
    }
  }
  return undefined;
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === 'string' ? value.trim() : '';
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    return Number(value);
  }
  return Number.NaN;
}

function readOptionalExpiry(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsedNumber = readNumber(record, key);
  if (Number.isFinite(parsedNumber)) {
    return parsedNumber;
  }
  if (typeof value === 'string') {
    const parsedTime = Date.parse(value);
    if (Number.isFinite(parsedTime)) {
      return Math.floor(parsedTime / 1000);
    }
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function currentUnixSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function notifyStoredAppSessionChange(): void {
  for (const listener of storedAppSessionChangeListeners) {
    listener();
  }
}

function readBrowserStorage(): string | null {
  const sessionRaw = readSessionStorage();
  if (sessionRaw) {
    return sessionRaw;
  }

  const legacyLocalRaw = readLocalStorage();
  if (!legacyLocalRaw) {
    return null;
  }

  try {
    const parsed = JSON.parse(legacyLocalRaw) as unknown;
    if (isStoredAppSessionToken(parsed)) {
      writeSessionStorage(parsed);
    }
  } catch {
    // Legacy localStorage payloads are cleared below.
  }
  removeLocalStorage();
  return readSessionStorage();
}

function writeBrowserStorage(token: StoredAppSessionToken): void {
  writeSessionStorage(token);
  removeLocalStorage();
}

function removeBrowserStorage(): void {
  removeLocalStorage();
  removeSessionStorage();
}

function readLocalStorage(): string | null {
  try {
    return globalThis.localStorage?.getItem(APP_SESSION_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

function removeLocalStorage(): void {
  try {
    globalThis.localStorage?.removeItem(APP_SESSION_STORAGE_KEY);
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}

function readSessionStorage(): string | null {
  try {
    return globalThis.sessionStorage?.getItem(APP_SESSION_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

function writeSessionStorage(token: StoredAppSessionToken): void {
  try {
    globalThis.sessionStorage?.setItem(APP_SESSION_STORAGE_KEY, JSON.stringify(token));
  } catch {
    // Memory storage remains available for restrictive browser contexts.
  }
}

function removeSessionStorage(): void {
  try {
    globalThis.sessionStorage?.removeItem(APP_SESSION_STORAGE_KEY);
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}
