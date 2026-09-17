import type { ConsoleSessionSnapshot } from '@sdkwork/cloudrouter-contracts';

const ACCESS_TOKEN_KEY = 'sdkwork.cloudrouter.mp.accessToken';
const AUTH_TOKEN_KEY = 'sdkwork.cloudrouter.mp.authToken';
const SUBJECT_KEY = 'sdkwork.cloudrouter.mp.subject';

/**
 * Minimal WeChat storage surface. Declaring it locally keeps the core free of
 * `miniprogram-api-typings` and makes the adapter trivially replaceable in tests.
 */
interface MpStorageAdapter {
  getStorageSync(key: string): unknown;
  setStorageSync(key: string, value: string): void;
  removeStorageSync(key: string): void;
}

function adapter(): MpStorageAdapter | null {
  const host = globalThis as unknown as { wx?: Partial<MpStorageAdapter> };
  const wx = host.wx;
  if (
    !wx
    || typeof wx.getStorageSync !== 'function'
    || typeof wx.setStorageSync !== 'function'
    || typeof wx.removeStorageSync !== 'function'
  ) {
    return null;
  }
  return wx as MpStorageAdapter;
}

function readString(key: string): string | null {
  const store = adapter();
  if (!store) return null;
  const value = store.getStorageSync(key);
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * Reads the console session snapshot. Tenant and organization follow the app
 * manifest defaults (`backend.tenantId` / `backend.organizationId`) exactly as
 * the H5 and PC roots do, so every client reports the same identity shape.
 */
export function readCloudRouterSession(): ConsoleSessionSnapshot {
  const accessToken = readString(ACCESS_TOKEN_KEY);
  const authToken = readString(AUTH_TOKEN_KEY);
  return {
    authenticated: Boolean(accessToken || authToken),
    accessToken,
    authToken,
    tenantId: '100001',
    organizationId: '0',
    subject: readString(SUBJECT_KEY),
  };
}

export function writeCloudRouterSession(session: ConsoleSessionSnapshot): void {
  const store = adapter();
  if (!store) return;
  if (session.accessToken) store.setStorageSync(ACCESS_TOKEN_KEY, session.accessToken);
  else store.removeStorageSync(ACCESS_TOKEN_KEY);
  if (session.authToken) store.setStorageSync(AUTH_TOKEN_KEY, session.authToken);
  else store.removeStorageSync(AUTH_TOKEN_KEY);
  if (session.subject) store.setStorageSync(SUBJECT_KEY, session.subject);
  else store.removeStorageSync(SUBJECT_KEY);
}

export function clearCloudRouterSession(): void {
  const store = adapter();
  if (!store) return;
  store.removeStorageSync(ACCESS_TOKEN_KEY);
  store.removeStorageSync(AUTH_TOKEN_KEY);
  store.removeStorageSync(SUBJECT_KEY);
}
