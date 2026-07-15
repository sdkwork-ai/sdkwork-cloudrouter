import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveBrowserReachableBaseUrl } from './packages/sdkwork-clawroutes-pc-commons/src/browser-base-url.ts';

test('rebinds server loopback URLs to the browser host', () => {
  assert.equal(
    resolveBrowserReachableBaseUrl('http://127.0.0.1:3900', { hostname: '192.168.31.108' }),
    'http://192.168.31.108:3900',
  );
  assert.equal(
    resolveBrowserReachableBaseUrl('http://localhost:3900/app/v3/api', { hostname: '10.8.0.4' }),
    'http://10.8.0.4:3900/app/v3/api',
  );
  assert.equal(
    resolveBrowserReachableBaseUrl('http://127.0.0.8:3900/v1', { hostname: '172.20.16.9' }),
    'http://172.20.16.9:3900/v1',
  );
  assert.equal(
    resolveBrowserReachableBaseUrl('http://127.0.0.1:3900/v1', { hostname: 'fd12:3456:789a::12' }),
    'http://[fd12:3456:789a::12]:3900/v1',
  );
  assert.equal(
    resolveBrowserReachableBaseUrl('http://[::1]:3900', { hostname: '192.168.50.12' }),
    'http://192.168.50.12:3900',
  );
});

test('preserves public, relative, and local-browser base URLs', () => {
  assert.equal(
    resolveBrowserReachableBaseUrl('https://api.sdkwork.com', { hostname: '192.168.31.108' }),
    'https://api.sdkwork.com',
  );
  assert.equal(
    resolveBrowserReachableBaseUrl('/app/v3/api', { hostname: '192.168.31.108' }),
    '/app/v3/api',
  );
  assert.equal(
    resolveBrowserReachableBaseUrl('http://127.0.0.1:3900', { hostname: '127.0.0.1' }),
    'http://127.0.0.1:3900',
  );
});
