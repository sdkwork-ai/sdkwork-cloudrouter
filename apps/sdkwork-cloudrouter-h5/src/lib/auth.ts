/** Auth token + session persistence for the H5 console. */

const TOKEN_KEY = 'cloudrouter-h5.token';
const SESSION_KEY = 'cloudrouter-h5.session';

export function getToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? '';
  } catch {
    return '';
  }
}

export function setToken(token: string): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function getSession(): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function setSession(session: Record<string, unknown> | null): void {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function clearAuth(): void {
  setToken('');
  setSession(null);
}

/**
 * Recursively locate an access-token-looking string in a login response.
 * SDKWork response envelopes vary (`data.accessToken`, `token`, …); the
 * extractor stays defensive instead of coupling to one shape.
 */
export function extractAccessToken(payload: unknown, depth = 0): string {
  if (depth > 6 || payload == null) return '';
  if (typeof payload === 'string') {
    return /^[\w-]+\.[\w-]+\.[\w-]+$/.test(payload) ? payload : '';
  }
  if (Array.isArray(payload)) {
    for (const item of payload) {
      const found = extractAccessToken(item, depth + 1);
      if (found) return found;
    }
    return '';
  }
  if (typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    for (const key of ['accessToken', 'access_token', 'sessionToken', 'bearerToken', 'token']) {
      const value = obj[key];
      if (typeof value === 'string' && value.length > 16) return value;
    }
    for (const value of Object.values(obj)) {
      const found = extractAccessToken(value, depth + 1);
      if (found) return found;
    }
  }
  return '';
}
