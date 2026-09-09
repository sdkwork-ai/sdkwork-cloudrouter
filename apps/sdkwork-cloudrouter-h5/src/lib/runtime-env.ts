/**
 * Deploy-time runtime env consumer (ENVIRONMENT_SPEC.md §5.1.0.1).
 * public/runtime-env.json is materialized by the canonical browser build
 * runner before Vite runs; the SPA reads it at runtime.
 */

import {resolveBaseUrlWithAlignProtocol} from '@sdkwork/sdk-common';

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
 * - cross-origin (cloud): resolve the materialized appApiBaseUrl list through
 *   @sdkwork/sdk-common (env + brand + protocol aware), which collapses the
 *   `;`/`,` candidates to the matched origin.
 * - fallback: same-origin (webserver sidecar proxies /api/)
 */
export function resolveAppApiOrigin(env: RuntimeEnv): string {
  if (env.appApiBaseUrl) {
    const resolved = resolveBaseUrlWithAlignProtocol({ baseUrls: [env.appApiBaseUrl] }).url;
    if (resolved) return resolved;
  }
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

export function appApiUrl(env: RuntimeEnv, path: string): string {
  return `${resolveAppApiOrigin(env)}${path}`;
}
