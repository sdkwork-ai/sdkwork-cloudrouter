import { appApiUrl, type RuntimeEnv } from './runtime-env';
import { clearAuth, getToken } from './auth';

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** Unwrap common SDKWork response envelopes (`{data}` / `{items}` / bare). */
export function unwrap<T = unknown>(body: unknown): T {
  if (body != null && typeof body === 'object' && !Array.isArray(body)) {
    const obj = body as Record<string, unknown>;
    for (const key of ['data', 'items', 'result', 'records']) {
      if (key in obj && obj[key] != null) return obj[key] as T;
    }
  }
  return body as T;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
}

export async function apiRequest<T = unknown>(
  env: RuntimeEnv,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(appApiUrl(env, path), {
    method: options.method ?? 'GET',
    headers,
    credentials: 'include',
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 401 || response.status === 403) {
    clearAuth();
    throw new ApiError(response.status, '登录状态已失效，请重新登录');
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const obj = (payload ?? {}) as Record<string, unknown>;
    const message =
      (typeof obj.message === 'string' && obj.message)
      || (typeof obj.error === 'string' && obj.error)
      || `请求失败（HTTP ${response.status}）`;
    const code = typeof obj.code === 'string' ? obj.code : undefined;
    throw new ApiError(response.status, message, code);
  }

  return unwrap<T>(payload);
}
