/**
 * Deploy-time runtime env consumer (ENVIRONMENT_SPEC.md §5.1.0.1).
 * public/runtime-env.json is materialized by the canonical browser build
 * runner before Vite runs; the SPA reads it at runtime.
 */

export interface RuntimeEnv {
  environment?: string;
  deploymentProfile?: string;
  profileId?: string;
  browserOriginMode?: string;
  appApiBaseUrl?: string;
  backendApiBaseUrl?: string;
  openApiBaseUrl?: string;
  cloudApiBaseUrls?: string[];
}

let cached: RuntimeEnv | null = null;

/** `a;b;c` origin materialization lists collapse to the first origin. */
function firstOrigin(value: string | undefined): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  return raw.split(/[;,]/)[0].trim().replace(/\/+$/u, '');
}

export async function loadRuntimeEnv(): Promise<RuntimeEnv> {
  if (cached) return cached;
  try {
    const response = await fetch('/runtime-env.json', { cache: 'no-store' });
    if (response.ok) {
      cached = (await response.json()) as RuntimeEnv;
    }
  } catch {
    // fall through to same-origin default
  }
  cached ??= {};
  return cached;
}

/**
 * Resolve the app API origin for `/app/v3/api/...` calls.
 * - cross-origin (cloud): first materialized appApiBaseUrl origin
 * - fallback: same-origin (webserver sidecar proxies /api/)
 */
export function resolveAppApiOrigin(env: RuntimeEnv): string {
  const origin = firstOrigin(env.appApiBaseUrl);
  if (origin) return origin;
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

export function appApiUrl(env: RuntimeEnv, path: string): string {
  return `${resolveAppApiOrigin(env)}${path}`;
}
