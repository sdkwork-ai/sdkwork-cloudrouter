import assert from 'node:assert/strict';
import test from 'node:test';

import {
  alignStandaloneSameOriginBrowserSdkRuntimeEnv,
  CLOUD_ROUTER_BROWSER_DEVELOPMENT_DEFAULT_VITE_ENV,
  isLoopbackAbsoluteUrl,
} from './cloud-router-browser-env-contract.mjs';

test('browser development defaults keep drive backend on same-origin backend prefix', () => {
  assert.equal(
    CLOUD_ROUTER_BROWSER_DEVELOPMENT_DEFAULT_VITE_ENV.VITE_SDKWORK_DRIVE_BACKEND_API_BASE_URL,
    '/backend/v3/api',
  );
});

test('alignStandaloneSameOriginBrowserSdkRuntimeEnv rewrites loopback dependency SDK URLs', () => {
  const aligned = alignStandaloneSameOriginBrowserSdkRuntimeEnv({
    VITE_CLOUDROUTER_APP_API_BASE_URL: '/app/v3/api',
    VITE_CLOUDROUTER_BACKEND_API_BASE_URL: '/backend/v3/api',
    VITE_SDKWORK_ACCOUNT_APP_API_BASE_URL: 'http://127.0.0.1:3902/app/v3/api',
    VITE_SDKWORK_DRIVE_BACKEND_API_BASE_URL: 'http://127.0.0.1:3900',
    VITE_SDKWORK_FEEDS_OPEN_API_BASE_URL: 'http://127.0.0.1:3902/feeds/v3/api',
    VITE_SDKWORK_CLOUDROUTER_ROUTER_APPLICATION_PUBLIC_HTTP_URL: 'http://127.0.0.1:3905',
  });

  assert.equal(aligned.VITE_SDKWORK_ACCOUNT_APP_API_BASE_URL, '/app/v3/api');
  assert.equal(aligned.VITE_SDKWORK_DRIVE_BACKEND_API_BASE_URL, '/backend/v3/api');
  assert.equal(aligned.VITE_SDKWORK_FEEDS_OPEN_API_BASE_URL, '/feeds/v3/api');
  assert.equal(aligned.VITE_SDKWORK_CLOUDROUTER_ROUTER_APPLICATION_PUBLIC_HTTP_URL, undefined);
});

test('alignStandaloneSameOriginBrowserSdkRuntimeEnv leaves release-style absolute URLs untouched', () => {
  const aligned = alignStandaloneSameOriginBrowserSdkRuntimeEnv({
    VITE_CLOUDROUTER_APP_API_BASE_URL: 'https://tenant.example.com/app/v3/api',
    VITE_SDKWORK_ACCOUNT_APP_API_BASE_URL: 'https://tenant.example.com/app/v3/api',
  });

  assert.equal(aligned.VITE_SDKWORK_ACCOUNT_APP_API_BASE_URL, 'https://tenant.example.com/app/v3/api');
});

test('alignStandaloneSameOriginBrowserSdkRuntimeEnv rewrites loopback canonical portal SDK URLs', () => {
  const aligned = alignStandaloneSameOriginBrowserSdkRuntimeEnv({
    PORTAL_PUBLIC_SDK_BASE_URL: 'http://127.0.0.1:3902',
    VITE_API_BASE_URL: 'http://127.0.0.1:3902/v1',
    VITE_CLOUDROUTER_OPEN_API_BASE_URL: 'http://127.0.0.1:3902/v1',
    VITE_CLOUDROUTER_APP_API_BASE_URL: '/app/v3/api',
    VITE_CLOUDROUTER_BACKEND_API_BASE_URL: '/backend/v3/api',
  });

  assert.equal(aligned.VITE_API_BASE_URL, '/v1');
  assert.equal(aligned.VITE_CLOUDROUTER_OPEN_API_BASE_URL, '/v1');
});

test('isLoopbackAbsoluteUrl detects local dev origins', () => {
  assert.equal(isLoopbackAbsoluteUrl('http://127.0.0.1:3900'), true);
  assert.equal(isLoopbackAbsoluteUrl('https://tenant.example.com/app/v3/api'), false);
  assert.equal(isLoopbackAbsoluteUrl('/app/v3/api'), false);
});
