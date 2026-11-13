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

// `resolveRuntimeEnv()` falls back to `globalThis`, which is the only channel a
// mini program has for build-time configuration.
Object.assign(globalThis, runtimeEnv);

App({
  globalData: {
    profileId: runtimeEnv.SDKWORK_PROFILE_ID,
    consolePorts: null,
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
