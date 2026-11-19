/**
 * WeChat mini program entry.
 *
 * Authority: `MINI_PROGRAM_APP_ARCHITECTURE_SPEC.md` section 6. This file is
 * plain CommonJS because the WeChat runtime loads it directly; everything it
 * depends on is bundled into `src/runtime/cloudrouter-app.js` by
 * `scripts/build-runtime.mjs`, and the materialized profile is
 * `src/runtime/runtime-env.js`. Neither file is hand-edited.
 *
 * Launch flow:
 * 1. inject the materialized profile onto `globalThis` — a mini program has no
 *    `import.meta.env`, and `resolveRuntimeEnv()` in
 *    `@sdkwork/cloudrouter-mp-core` reads the runtime environment from there;
 * 2. bootstrap (environment -> SDK clients -> console ports -> translator);
 * 3. publish the console ports and translator on `globalData` for the pages.
 */

const runtimeEnv = require('./runtime/runtime-env.js');
const { bootstrapMiniProgramApplication } = require('./runtime/cloudrouter-app.js');

/**
 * The generated SDKs use the standard fetch/AbortController surface. WeChat
 * exposes `wx.request` instead, so bind the two globals before the bundle
 * constructs any generated client. This keeps every community read/write on the
 * generated SDK transport rather than hand-rolled page HTTP.
 */
function installMiniProgramTransportPolyfills() {
  if (typeof globalThis.AbortController !== 'function') {
    class MiniAbortSignal {
      constructor() {
        this.aborted = false;
        this.listeners = [];
      }

      addEventListener(type, listener) {
        if (type === 'abort') this.listeners.push(listener);
      }

      removeEventListener(type, listener) {
        if (type === 'abort') {
          this.listeners = this.listeners.filter((entry) => entry !== listener);
        }
      }

      abort() {
        this.aborted = true;
        for (const listener of this.listeners) {
          try {
            listener();
          } catch {}
        }
        this.listeners = [];
      }
    }

    class MiniAbortController {
      constructor() {
        this.signal = new MiniAbortSignal();
      }

      abort() {
        this.signal.abort();
      }
    }

    globalThis.AbortController = MiniAbortController;
  }

  if (typeof globalThis.fetch !== 'function') {
    globalThis.fetch = function miniProgramFetch(url, options) {
      const request = options || {};
      const headers = request.headers || {};
      return new Promise((resolve, reject) => {
        wx.request({
          url: String(url),
          method: request.method || 'GET',
          header: headers,
          data: request.body,
          dataType: 'text',
          success(response) {
            const responseHeaders = response.header || {};
            resolve({
              status: response.statusCode,
              ok: response.statusCode >= 200 && response.statusCode < 300,
              headers: {
                get(name) {
                  const lower = String(name).toLowerCase();
                  for (const key of Object.keys(responseHeaders)) {
                    if (key.toLowerCase() === lower) return responseHeaders[key];
                  }
                  return null;
                },
              },
              text: async () =>
                typeof response.data === 'string'
                  ? response.data
                  : JSON.stringify(response.data ?? ''),
              json: async () =>
                typeof response.data === 'string'
                  ? JSON.parse(response.data)
                  : response.data,
            });
          },
          fail(error) {
            reject(new Error(error && error.errMsg ? error.errMsg : 'network error'));
          },
        });
      });
    };
  }
}

installMiniProgramTransportPolyfills();

// `resolveRuntimeEnv()` falls back to `globalThis`, which is the only channel a
// mini program has for build-time configuration.
Object.assign(globalThis, runtimeEnv);

App({
  globalData: {
    profileId: runtimeEnv.SDKWORK_PROFILE_ID,
    consolePorts: null,
    communityApi: null,
    webPublicHttpUrl: '',
    settingsBinding: null,
    settingsRuntime: null,
    translate: null,
    locale: 'zh-CN',
    ready: false,
    error: null,
  },

  onLaunch() {
    try {
      const runtime = bootstrapMiniProgramApplication();
      this.globalData.consolePorts = runtime.consolePorts;
      this.globalData.communityApi = runtime.communityApi;
      this.globalData.webPublicHttpUrl = runtime.webPublicHttpUrl;
      this.globalData.settingsBinding = runtime.settingsBinding;
      this.globalData.settingsRuntime = runtime.settingsRuntime;
      this.globalData.translate = runtime.translate;
      this.globalData.locale = runtime.locale;
      this.globalData.ready = true;
    } catch (error) {
      // A failed bootstrap must be visible: the pages render an error state
      // instead of an empty console.
      this.globalData.error = error instanceof Error ? error.message : String(error);
      console.error('[cloudrouter-mini-program] bootstrap failed', error);
    }
  },

  /** Resolves the H5 `appearance.theme` value against the mini-program system. */
  resolveTheme() {
    const runtime = this.globalData.settingsRuntime;
    const pref = runtime?.getSnapshot?.().values?.['appearance.theme'] ?? 'system';
    if (pref === 'light' || pref === 'dark') return pref;
    try {
      return wx.getSystemInfoSync().theme === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  },

  themeClass() {
    return this.resolveTheme() === 'dark' ? 'theme-dark' : '';
  },

  /** Applies the native navigation/tab chrome for the active theme. */
  applyChrome() {
    const dark = this.resolveTheme() === 'dark';
    const background = dark ? '#0f172a' : '#ffffff';
    const foreground = dark ? '#ffffff' : '#000000';
    try {
      wx.setNavigationBarColor({ backgroundColor: background, frontColor: foreground });
    } catch {}
    try {
      wx.setTabBarStyle({
        color: dark ? '#94a3b8' : '#64748b',
        selectedColor: '#2563eb',
        backgroundColor: background,
        borderStyle: dark ? 'black' : 'white',
      });
    } catch {}
  },
});
