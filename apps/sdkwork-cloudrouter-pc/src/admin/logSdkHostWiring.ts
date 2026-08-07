//! Cloud Router host wiring for the SDKWork log capability backend SDK.
//!
//! The request-log admin module (`@sdkwork/log-pc-admin-request-log`) queries
//! the log API through the `@sdkwork/log-pc-request-log` boundary, whose shared
//! `@sdkwork/log-backend-sdk` client is created on first use WITHOUT credentials
//! unless the hosting application injects them via `configureLogBackendSdkClient`.
//! The generated log backend SDK requires an `Access-Token` for non-open-api
//! calls, so without this wiring every request throws before dispatch
//! (`non-open-api request requires Access-Token before request dispatch`) and
//! the admin page reports "请求日志加载失败".
//!
//! The portal injects the same global app-session token manager it already
//! provides to every other backend SDK family, plus the same backend base URL
//! resolution used for `@sdkwork/cloudrouter-backend-sdk`.

import { configureLogBackendSdkClient } from '@sdkwork/log-pc-request-log';
import {
  BACKEND_API_PREFIX,
  getCloudRouterGlobalTokenManager,
  normalizeGeneratedSdkBaseUrl,
} from '@sdkwork/cloudroutes-pc-commons/sdk-clients';
import { readCloudRouterRuntimeEnv } from '@sdkwork/cloudroutes-pc-commons/utils/env';

/**
 * Wires the shared log backend SDK client to the portal backend surface and
 * the portal's global app-session token manager. Must run before the
 * request-log admin module performs its first request, so it is invoked at
 * application startup.
 */
export function configureCloudRouterLogBackendSdkClient(): void {
  configureLogBackendSdkClient({
    baseUrl: normalizeGeneratedSdkBaseUrl(
      readCloudRouterRuntimeEnv('VITE_CLOUDROUTER_BACKEND_API_BASE_URL') ?? BACKEND_API_PREFIX,
      BACKEND_API_PREFIX,
    ),
    platform: 'web-admin',
    tokenManager: getCloudRouterGlobalTokenManager(),
  });
}
