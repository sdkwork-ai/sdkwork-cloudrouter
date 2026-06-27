import assert from 'node:assert/strict';
import test from 'node:test';

import { fetchSiteBranding, resetSiteBrandingCache, DEFAULT_SITE_BRANDING } from './packages/sdkwork-clawroutes-pc-commons/src/siteBranding.ts';
import { resetClawRouterSdkClients } from './packages/sdkwork-clawroutes-pc-commons/src/sdk-clients.ts';

test('site branding fetch reads from the app sites runtime sdk surface', async () => {
  resetClawRouterSdkClients();
  resetSiteBrandingCache();

  const host = globalThis;
  const originalSdk = (host as typeof globalThis & {
    __SDKWORK_CLAW_ROUTER_APP_SDK_CLIENT__?: unknown;
  }).__SDKWORK_CLAW_ROUTER_APP_SDK_CLIENT__;

  let called = 0;
  (host as typeof globalThis & {
    __SDKWORK_CLAW_ROUTER_APP_SDK_CLIENT__?: {
      sites: {
        runtime: {
          retrieve: () => Promise<unknown>;
        };
      };
    };
  }).__SDKWORK_CLAW_ROUTER_APP_SDK_CLIENT__ = {
    sites: {
      runtime: {
        async retrieve() {
          called += 1;
          return {
            code: 0,
            data: {
              siteName: 'Custom Site',
              shortName: 'CS',
              description: 'Branding source test',
              brandColor: '#112233',
              accentColor: '#445566',
            },
          };
        },
      },
    },
  };

  try {
    const branding = await fetchSiteBranding();
    assert.equal(called, 1);
    assert.equal(branding.siteName, 'Custom Site');
    assert.equal(branding.shortName, 'CS');
    assert.equal(branding.brandColor, '#112233');
    assert.equal(branding.accentColor, '#445566');
    assert.notEqual(branding.siteName, DEFAULT_SITE_BRANDING.siteName);
  } finally {
    (host as typeof globalThis & {
      __SDKWORK_CLAW_ROUTER_APP_SDK_CLIENT__?: unknown;
    }).__SDKWORK_CLAW_ROUTER_APP_SDK_CLIENT__ = originalSdk;
    resetSiteBrandingCache();
    resetClawRouterSdkClients();
  }
});

test('site branding falls back to the default branding when the sites runtime sdk surface is unavailable', async () => {
  resetClawRouterSdkClients();
  resetSiteBrandingCache();

  const host = globalThis as typeof globalThis & {
    __SDKWORK_CLAW_ROUTER_APP_SDK_CLIENT__?: unknown;
  };
  const originalSdk = host.__SDKWORK_CLAW_ROUTER_APP_SDK_CLIENT__;
  host.__SDKWORK_CLAW_ROUTER_APP_SDK_CLIENT__ = {};

  try {
    const branding = await fetchSiteBranding();
    assert.equal(branding.siteName, DEFAULT_SITE_BRANDING.siteName);
    assert.equal(branding.shortName, DEFAULT_SITE_BRANDING.shortName);
    assert.equal(branding.brandColor, DEFAULT_SITE_BRANDING.brandColor);
    assert.equal(branding.accentColor, DEFAULT_SITE_BRANDING.accentColor);
  } finally {
    host.__SDKWORK_CLAW_ROUTER_APP_SDK_CLIENT__ = originalSdk;
    resetSiteBrandingCache();
    resetClawRouterSdkClients();
  }
});
