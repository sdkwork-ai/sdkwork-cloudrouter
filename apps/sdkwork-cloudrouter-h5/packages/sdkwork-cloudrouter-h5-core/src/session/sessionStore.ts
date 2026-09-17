import type { ConsoleSessionSnapshot } from '@sdkwork/cloudrouter-contracts';

const ACCESS_TOKEN_KEY = 'sdkwork.cloudrouter.h5.accessToken';
const AUTH_TOKEN_KEY = 'sdkwork.cloudrouter.h5.authToken';
const SUBJECT_KEY = 'sdkwork.cloudrouter.h5.subject';

function readStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readCloudRouterSession(): ConsoleSessionSnapshot {
  const storage = readStorage();
  const accessToken = storage?.getItem(ACCESS_TOKEN_KEY) ?? null;
  const authToken = storage?.getItem(AUTH_TOKEN_KEY) ?? null;
  return {
    authenticated: Boolean(accessToken || authToken),
    accessToken: accessToken || null,
    authToken: authToken || null,
    tenantId: '100001',
    organizationId: '0',
    subject: storage?.getItem(SUBJECT_KEY) ?? null,
  };
}

export function writeCloudRouterSession(session: ConsoleSessionSnapshot): void {
  const storage = readStorage();
  if (!storage) return;
  if (session.accessToken) storage.setItem(ACCESS_TOKEN_KEY, session.accessToken);
  else storage.removeItem(ACCESS_TOKEN_KEY);
  if (session.authToken) storage.setItem(AUTH_TOKEN_KEY, session.authToken);
  else storage.removeItem(AUTH_TOKEN_KEY);
  if (session.subject) storage.setItem(SUBJECT_KEY, session.subject);
  else storage.removeItem(SUBJECT_KEY);
}

export function clearCloudRouterSession(): void {
  const storage = readStorage();
  if (!storage) return;
  storage.removeItem(ACCESS_TOKEN_KEY);
  storage.removeItem(AUTH_TOKEN_KEY);
  storage.removeItem(SUBJECT_KEY);
}
