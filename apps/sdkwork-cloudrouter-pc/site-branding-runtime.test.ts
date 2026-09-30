import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_SITE_BRANDING,
  fetchSiteBranding,
  getCachedSiteBranding,
  resetSiteBrandingCache,
  watchSiteBrandingLocale,
} from './packages/sdkwork-cloudroutes-pc-commons/src/siteBranding.ts';
import { resetCloudRouterSdkClients } from './packages/sdkwork-cloudroutes-pc-commons/src/sdk-clients.ts';

/**
 * The smallest `document` the branding applier touches.
 *
 * `applySiteBrandingToDocument` walks the head (title, description meta, favicon, custom CSS) and
 * the root element's inline style, so the fake only has to answer those lookups. Returning `null`
 * from every `querySelector` makes the applier take its "create and append" branch, which is the
 * one that would throw on a partial document.
 */
function installFakeDocument(): {
  appended: Array<Record<string, unknown>>;
  documentElement: { lang: string };
  restore: () => void;
} {
  const appended: Array<Record<string, unknown>> = [];
  const documentElement = { lang: 'en-US', style: { setProperty: () => {} } };
  const fakeDocument = {
    documentElement,
    head: {
      appendChild(node: Record<string, unknown>) {
        appended.push(node);
        return node;
      },
    },
    title: '',
    createElement(tagName: string) {
      return { tagName };
    },
    getElementById() {
      return null;
    },
    querySelector() {
      return null;
    },
  };
  const host = globalThis as unknown as { document?: unknown };
  const original = host.document;
  host.document = fakeDocument;
  return {
    appended,
    documentElement,
    restore: () => {
      host.document = original;
    },
  };
}

/** Captures the `<html lang>` observer so the test can fire it by hand. */
function installFakeMutationObserver(): {
  fire: () => void;
  isObservingRootLang: () => boolean;
  restore: () => void;
} {
  const callbacks: Array<() => void> = [];
  const observations: Array<{ attributeFilter?: string[]; target?: unknown }> = [];
  class FakeMutationObserver {
    private readonly callback: () => void;

    constructor(callback: () => void) {
      this.callback = callback;
      callbacks.push(() => this.callback());
    }

    disconnect() {}

    observe(target: unknown, options?: { attributeFilter?: string[] }) {
      observations.push({ target, attributeFilter: options?.attributeFilter });
    }
  }
  const host = globalThis as unknown as { MutationObserver?: unknown };
  const original = host.MutationObserver;
  host.MutationObserver = FakeMutationObserver;
  return {
    fire: () => {
      for (const callback of callbacks) {
        callback();
      }
    },
    isObservingRootLang: () =>
      observations.some((entry) => entry.attributeFilter?.includes('lang') === true),
    restore: () => {
      host.MutationObserver = original;
    },
  };
}

function installFakeLocalStorage(value: string | null): { restore: () => void } {
  const host = globalThis as unknown as { localStorage?: unknown };
  const original = host.localStorage;
  host.localStorage = {
    getItem: (key: string) => (key === 'user_explicit_lang' ? value : null),
  };
  return {
    restore: () => {
      host.localStorage = original;
    },
  };
}

test('site branding fetch reads from the app system site runtime sdk surface', async () => {
  resetCloudRouterSdkClients();
  resetSiteBrandingCache();

  const host = globalThis;
  const originalSdk = (host as typeof globalThis & {
    __SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__?: unknown;
  }).__SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__;

  let called = 0;
  (host as typeof globalThis & {
    __SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__?: {
      system: {
        site: {
          runtime: {
            retrieve: () => Promise<unknown>;
          };
        };
      };
    };
  }).__SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__ = {
    system: {
      site: {
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
      __SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__?: unknown;
    }).__SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__ = originalSdk;
    resetSiteBrandingCache();
    resetCloudRouterSdkClients();
  }
});

test('site branding falls back to the default branding when the system site runtime sdk surface is unavailable', async () => {
  resetCloudRouterSdkClients();
  resetSiteBrandingCache();

  const host = globalThis as typeof globalThis & {
    __SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__?: unknown;
  };
  const originalSdk = host.__SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__;
  host.__SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__ = {};

  try {
    const branding = await fetchSiteBranding();
    assert.equal(branding.siteName, DEFAULT_SITE_BRANDING.siteName);
    assert.equal(branding.shortName, DEFAULT_SITE_BRANDING.shortName);
    assert.equal(branding.brandColor, DEFAULT_SITE_BRANDING.brandColor);
    assert.equal(branding.accentColor, DEFAULT_SITE_BRANDING.accentColor);
  } finally {
    host.__SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__ = originalSdk;
    resetSiteBrandingCache();
    resetCloudRouterSdkClients();
  }
});

test('site branding carries all four footer QR channels and their visibility switches', async () => {
  resetCloudRouterSdkClients();
  resetSiteBrandingCache();

  const host = globalThis as typeof globalThis & {
    __SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__?: unknown;
  };
  const originalSdk = host.__SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__;

  host.__SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__ = {
    system: {
      site: {
        runtime: {
          async retrieve() {
            return {
              code: 0,
              data: {
                siteName: 'Custom Site',
                officialAccountQrCode: {
                  kind: 'image',
                  source: 'external_url',
                  publicUrl: 'https://example.com/official-account-qr.png',
                },
                videoChannelQrCode: {
                  kind: 'image',
                  source: 'external_url',
                  publicUrl: 'https://example.com/video-channel-qr.png',
                },
                douyinQrCode: {
                  kind: 'image',
                  source: 'external_url',
                  publicUrl: 'https://example.com/douyin-qr.png',
                },
                communityGroupQrCode: {
                  kind: 'image',
                  source: 'external_url',
                  publicUrl: 'https://example.com/community-group-qr.png',
                },
                officialAccountQrCodeEnabled: true,
                videoChannelQrCodeEnabled: false,
                douyinQrCodeEnabled: true,
                communityGroupQrCodeEnabled: false,
              },
            };
          },
        },
      },
    },
  };

  try {
    const branding = await fetchSiteBranding();
    assert.equal(
      branding.officialAccountQrCode?.publicUrl,
      'https://example.com/official-account-qr.png',
    );
    assert.equal(branding.videoChannelQrCode?.publicUrl, 'https://example.com/video-channel-qr.png');
    assert.equal(branding.douyinQrCode?.publicUrl, 'https://example.com/douyin-qr.png');
    assert.equal(
      branding.communityGroupQrCode?.publicUrl,
      'https://example.com/community-group-qr.png',
    );
    // A switched-off channel keeps its artwork in the payload; only the flag decides
    // whether the footer renders it, so the operator does not lose the upload.
    assert.equal(branding.officialAccountQrCodeEnabled, true);
    assert.equal(branding.videoChannelQrCodeEnabled, false);
    assert.equal(branding.douyinQrCodeEnabled, true);
    assert.equal(branding.communityGroupQrCodeEnabled, false);
  } finally {
    host.__SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__ = originalSdk;
    resetSiteBrandingCache();
    resetCloudRouterSdkClients();
  }
});

test('site branding reads the configured follow-us row and footer region switches', async () => {
  resetCloudRouterSdkClients();
  resetSiteBrandingCache();

  const host = globalThis as typeof globalThis & {
    __SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__?: unknown;
  };
  const originalSdk = host.__SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__;

  host.__SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__ = {
    system: {
      site: {
        runtime: {
          async retrieve() {
            return {
              code: 0,
              data: {
                siteName: 'Configured Site',
                footerBrandEnabled: false,
                footerNewsletterEnabled: true,
                footerCompanyLinksEnabled: false,
                footerSocialGithubEnabled: false,
                footerSocialGithubUrl: '',
                footerSocialBilibiliEnabled: true,
                footerSocialBilibiliUrl: 'https://space.bilibili.com/42',
                footerSocialEmailUrl: 'mailto:ops@example.com',
              },
            };
          },
        },
      },
    },
  };

  try {
    const branding = await fetchSiteBranding();
    assert.deepEqual(branding.footerSections, {
      brand: false,
      newsletter: true,
      productLinks: true,
      resourceLinks: true,
      companyLinks: false,
      qrCodes: true,
      social: true,
      legal: true,
    });
    assert.deepEqual(branding.socialLinks.github, { enabled: false, url: '' });
    assert.deepEqual(branding.socialLinks.bilibili, {
      enabled: true,
      url: 'https://space.bilibili.com/42',
    });
    // Only the URL was supplied for email; the switch keeps its shipped default rather than
    // being read as "off" just because the payload skipped it.
    assert.deepEqual(branding.socialLinks.email, {
      enabled: true,
      url: 'mailto:ops@example.com',
    });
  } finally {
    host.__SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__ = originalSdk;
    resetSiteBrandingCache();
    resetCloudRouterSdkClients();
  }
});

test('site branding keeps the pre-configuration footer when the payload omits the footer fields', async () => {
  resetCloudRouterSdkClients();
  resetSiteBrandingCache();

  const host = globalThis as typeof globalThis & {
    __SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__?: unknown;
  };
  const originalSdk = host.__SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__;

  host.__SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__ = {
    system: {
      site: {
        runtime: {
          async retrieve() {
            return { code: 0, data: { siteName: 'Legacy Site' } };
          },
        },
      },
    },
  };

  try {
    const branding = await fetchSiteBranding();
    // Making the footer composable must not change what an untouched deployment renders. Every
    // region stays visible, and the follow-us row still shows exactly the links that used to be
    // hardcoded — nothing is silently switched off by the upgrade.
    assert.deepEqual(branding.footerSections, {
      brand: true,
      newsletter: true,
      productLinks: true,
      resourceLinks: true,
      companyLinks: true,
      qrCodes: true,
      social: true,
      legal: true,
    });
    const enabledCodes = Object.entries(branding.socialLinks)
      .filter(([, link]) => link.enabled)
      .map(([code]) => code)
      .sort();
    assert.deepEqual(enabledCodes, ['email', 'github', 'linkedin', 'twitter']);
    assert.equal(branding.socialLinks.github.url, 'https://github.com/sdkwork-ai');
    assert.equal(branding.socialLinks.email.url, 'mailto:contact@sdkwork.com');
    assert.equal(branding.socialLinks.bilibili.url, '');
  } finally {
    host.__SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__ = originalSdk;
    resetSiteBrandingCache();
    resetCloudRouterSdkClients();
  }
});

test('site branding shows every QR channel when the backend omits the switches', async () => {
  resetCloudRouterSdkClients();
  resetSiteBrandingCache();

  const host = globalThis as typeof globalThis & {
    __SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__?: unknown;
  };
  const originalSdk = host.__SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__;

  host.__SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__ = {
    system: {
      site: {
        runtime: {
          async retrieve() {
            return { code: 0, data: { siteName: 'Legacy Site' } };
          },
        },
      },
    },
  };

  try {
    const branding = await fetchSiteBranding();
    // An older payload has no switch columns at all; the footer must still advertise the
    // channels rather than silently hiding every one of them.
    assert.equal(branding.officialAccountQrCodeEnabled, true);
    assert.equal(branding.videoChannelQrCodeEnabled, true);
    assert.equal(branding.douyinQrCodeEnabled, true);
    assert.equal(branding.communityGroupQrCodeEnabled, true);
  } finally {
    host.__SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__ = originalSdk;
    resetSiteBrandingCache();
    resetCloudRouterSdkClients();
  }
});

/**
 * The published site copy is resolved server-side from `Accept-Language`, so a language switch has
 * to re-ask the server — the cached payload belongs to the language it was fetched in, and reusing
 * it would keep the old copy on screen under a new `<html lang>`.
 *
 * The stub returns copy keyed by the language the app would have sent, which is what makes the
 * assertion meaningful: it is the *resolved* copy that has to change, not merely the request count.
 */
test('switching language re-fetches the branding instead of reusing the previous language', async () => {
  resetCloudRouterSdkClients();
  resetSiteBrandingCache();

  const host = globalThis as typeof globalThis & {
    __SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__?: unknown;
  };
  const originalSdk = host.__SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__;
  const fakeDocument = installFakeDocument();
  const fakeObserver = installFakeMutationObserver();

  let called = 0;
  host.__SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__ = {
    system: {
      site: {
        runtime: {
          async retrieve() {
            called += 1;
            const locale = fakeDocument.documentElement.lang;
            return { code: 0, data: { siteName: locale === 'zh-CN' ? '云路由' : 'Cloud Router' } };
          },
        },
      },
    },
  };

  try {
    const stopWatching = watchSiteBrandingLocale();
    assert.equal(fakeObserver.isObservingRootLang(), true, 'the watcher must observe <html lang>');

    const first = await fetchSiteBranding();
    assert.equal(first.siteName, 'Cloud Router');
    assert.equal(called, 1);

    // What the i18n provider does on `languageChanged`: mirror the active locale onto the root.
    fakeDocument.documentElement.lang = 'zh-CN';
    fakeObserver.fire();
    await fetchSiteBranding();

    assert.equal(called, 2, 'a language switch must issue a second request');
    assert.equal(getCachedSiteBranding().siteName, '云路由');
    assert.notEqual(first.siteName, getCachedSiteBranding().siteName);

    stopWatching();
  } finally {
    host.__SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__ = originalSdk;
    fakeObserver.restore();
    fakeDocument.restore();
    resetSiteBrandingCache();
    resetCloudRouterSdkClients();
  }
});

/**
 * An explicit language preference outranks `<html lang>` in `resolveSdkworkSdkLocale`, so a root
 * attribute write that does not move the effective locale must not cost a round trip. Without this
 * guard every unrelated `<html lang>` write would re-download the branding.
 */
test('a <html lang> write that does not change the effective locale costs no request', async () => {
  resetCloudRouterSdkClients();
  resetSiteBrandingCache();

  const host = globalThis as typeof globalThis & {
    __SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__?: unknown;
  };
  const originalSdk = host.__SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__;
  const fakeDocument = installFakeDocument();
  const fakeObserver = installFakeMutationObserver();
  const fakeStorage = installFakeLocalStorage('en-US');

  let called = 0;
  host.__SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__ = {
    system: {
      site: {
        runtime: {
          async retrieve() {
            called += 1;
            return { code: 0, data: { siteName: 'Cloud Router' } };
          },
        },
      },
    },
  };

  try {
    const stopWatching = watchSiteBrandingLocale();
    await fetchSiteBranding();
    assert.equal(called, 1);

    // The attribute moves, but the request would still be sent as `en-US`.
    fakeDocument.documentElement.lang = 'zh-CN';
    fakeObserver.fire();
    await fetchSiteBranding();

    assert.equal(called, 1, 'an ineffective locale change must not refetch');

    stopWatching();
  } finally {
    host.__SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__ = originalSdk;
    fakeStorage.restore();
    fakeObserver.restore();
    fakeDocument.restore();
    resetSiteBrandingCache();
    resetCloudRouterSdkClients();
  }
});

const SITE_BRANDING_STORAGE_KEY = 'sdkwork-cloudrouter-site-branding:v1';

/**
 * Backing-map storage double.
 *
 * Unlike `installFakeLocalStorage`, this one is writable, because the snapshot tier both reads and
 * writes the payload, and the locale has to be pinned explicitly: `resolveSdkworkSdkLocale` falls
 * back to `navigator.language` in the Node runtime, which would make a locale assertion depend on
 * the machine's system language.
 */
function installWritableLocalStorage(initial: Record<string, string> = {}): {
  read: (key: string) => string | null;
  restore: () => void;
} {
  const store = new Map<string, string>(Object.entries(initial));
  const host = globalThis as unknown as { localStorage?: unknown };
  const original = host.localStorage;
  host.localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
  return {
    read: (key: string) => store.get(key) ?? null,
    restore: () => {
      host.localStorage = original;
    },
  };
}

function siteBrandingSdkStub(retrieve: () => Promise<unknown>): unknown {
  return { system: { site: { runtime: { retrieve } } } };
}

function flushAsyncWork(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function storedSnapshot(locale: string, siteName: string, storedAt = Date.now()): string {
  return JSON.stringify({ locale, storedAt, record: { siteName } });
}

/**
 * The snapshot tier exists to take the round trip off the first paint. What makes it safe is that
 * it is *not* authoritative: the assertion below is two-sided on purpose — the stored copy is
 * served immediately, and the endpoint is still read and still wins.
 */
test('a stored snapshot paints first while the runtime read revalidates it', async () => {
  resetCloudRouterSdkClients();
  resetSiteBrandingCache();

  const host = globalThis as typeof globalThis & {
    __SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__?: unknown;
  };
  const originalSdk = host.__SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__;
  const fakeStorage = installWritableLocalStorage({
    user_explicit_lang: 'en-US',
    [SITE_BRANDING_STORAGE_KEY]: storedSnapshot('en-US', 'Stored Site'),
  });

  let called = 0;
  let releaseRetrieve: ((value: unknown) => void) | null = null;
  host.__SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__ = siteBrandingSdkStub(() => {
    called += 1;
    return new Promise((resolve) => {
      releaseRetrieve = resolve;
    });
  });

  try {
    const firstPaint = await fetchSiteBranding();
    assert.equal(firstPaint.siteName, 'Stored Site', 'the stored copy must be served without waiting');
    assert.equal(called, 1, 'the snapshot must not suppress the runtime read');

    assert.ok(releaseRetrieve, 'the read must have been issued');
    releaseRetrieve!({ code: 0, data: { siteName: 'Live Site' } });
    await flushAsyncWork();

    assert.equal(
      getCachedSiteBranding().siteName,
      'Live Site',
      'the read must replace the snapshot once it lands',
    );
    const persisted = JSON.parse(fakeStorage.read(SITE_BRANDING_STORAGE_KEY) ?? '{}') as {
      locale?: string;
      record?: { siteName?: string };
    };
    assert.equal(persisted.record?.siteName, 'Live Site');
    assert.equal(persisted.locale, 'en-US');
  } finally {
    host.__SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__ = originalSdk;
    fakeStorage.restore();
    resetSiteBrandingCache();
    resetCloudRouterSdkClients();
  }
});

/**
 * The endpoint resolves every copy field from `Accept-Language`, so replaying another language's
 * snapshot would show the previous language's `siteName` under the active locale. Same for a
 * snapshot old enough to predate an operator's edit.
 */
test('a stored snapshot for another language or an expired one is not reused', async () => {
  for (const [label, entry] of [
    ['another language', storedSnapshot('zh-CN', 'Stored Site')],
    ['expired', storedSnapshot('en-US', 'Stored Site', Date.now() - 25 * 60 * 60 * 1000)],
  ] as const) {
    resetCloudRouterSdkClients();
    resetSiteBrandingCache();

    const host = globalThis as typeof globalThis & {
      __SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__?: unknown;
    };
    const originalSdk = host.__SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__;
    const fakeStorage = installWritableLocalStorage({
      user_explicit_lang: 'en-US',
      [SITE_BRANDING_STORAGE_KEY]: entry,
    });

    let called = 0;
    host.__SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__ = siteBrandingSdkStub(async () => {
      called += 1;
      return { code: 0, data: { siteName: 'Live Site' } };
    });

    try {
      const branding = await fetchSiteBranding();
      assert.equal(branding.siteName, 'Live Site', `a snapshot from ${label} must not be shown`);
      assert.equal(called, 1);
    } finally {
      host.__SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__ = originalSdk;
      fakeStorage.restore();
      resetSiteBrandingCache();
      resetCloudRouterSdkClients();
    }
  }
});

/**
 * A transient failure used to latch the placeholder for the rest of the session, because the cache
 * store was only ever cleared by an explicit reset. The placeholder must stay on screen — there is
 * nothing better to show — but it must not be treated as the site's branding.
 */
test('a failed runtime read keeps the placeholder out of the authoritative cache', async () => {
  resetCloudRouterSdkClients();
  resetSiteBrandingCache();

  const host = globalThis as typeof globalThis & {
    __SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__?: unknown;
  };
  const originalSdk = host.__SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__;

  let called = 0;
  host.__SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__ = siteBrandingSdkStub(async () => {
    called += 1;
    // A transport failure: the read never produced a payload at all.
    throw new Error('site runtime transport failed');
  });

  try {
    const branding = await fetchSiteBranding();
    assert.equal(branding.siteName, DEFAULT_SITE_BRANDING.siteName);
    assert.equal(called, 1);

    await fetchSiteBranding();
    await flushAsyncWork();
    assert.equal(called, 2, 'a failed read must leave the endpoint reachable for the next caller');
  } finally {
    host.__SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__ = originalSdk;
    resetSiteBrandingCache();
    resetCloudRouterSdkClients();
  }
});
