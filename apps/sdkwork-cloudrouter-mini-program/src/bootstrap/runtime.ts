import {
  createCloudRouterMpConsolePorts,
  resolveRuntimeEnv,
} from '@sdkwork/cloudrouter-mp-core';
import {
  createConsoleTranslator,
  resolveConsoleLocale,
  type SdkworkConsoleLocale,
} from '@sdkwork/cloudrouter-mp-i18n';
import {
  SdkworkMemorySettingsStore,
  createDefaultSdkworkSettingsCatalog,
  createSdkworkSettingsCatalog,
  createSdkworkSettingsRuntime,
  createSdkworkSettingsStorageKey,
  type SdkworkSettingsRuntime,
  type SdkworkSettingsStorePort,
  type SdkworkSettingsValue,
} from '@sdkwork/settings-core';
import {
  createSdkworkMiniProgramSettingsBinding,
  type SdkworkMiniProgramSettingsBinding,
} from '@sdkwork/settings-mini-program';

interface MiniWxStorage {
  getStorageSync(key: string): unknown;
  removeStorageSync(key: string): void;
  setStorageSync(key: string, value: unknown): void;
}

const CLOUDROUTER_SETTINGS_SECTIONS = new Set([
  'appearance',
  'voice',
  'notifications',
  'about',
]);

function createMiniSettingsCatalog() {
  const defaults = createDefaultSdkworkSettingsCatalog();
  const sections = defaults.sections.filter((section) =>
    CLOUDROUTER_SETTINGS_SECTIONS.has(section.id),
  );
  const settings = defaults.settings.filter((setting) =>
    CLOUDROUTER_SETTINGS_SECTIONS.has(setting.sectionId),
  );
  const groups = defaults.groups.filter((group) =>
    sections.some((section) => section.groupId === group.id),
  );
  return createSdkworkSettingsCatalog({ groups, sections, settings });
}

function createMiniSettingsStore(): SdkworkSettingsStorePort {
  const storage = (globalThis as { wx?: MiniWxStorage }).wx;
  if (!storage) {
    return new SdkworkMemorySettingsStore();
  }
  return {
    async load(query) {
      try {
        const values = storage.getStorageSync(createSdkworkSettingsStorageKey(query));
        return values && typeof values === 'object'
          ? { values: values as Record<string, SdkworkSettingsValue> }
          : null;
      } catch {
        return null;
      }
    },
    async save(request) {
      storage.setStorageSync(
        createSdkworkSettingsStorageKey(request.query),
        request.values,
      );
      return { values: request.values };
    },
    async reset(request) {
      const key = createSdkworkSettingsStorageKey(request.query);
      if (!request.settingIds) {
        storage.removeStorageSync(key);
        return;
      }
      try {
        const stored = storage.getStorageSync(key);
        if (stored && typeof stored === 'object') {
          const values = { ...(stored as Record<string, SdkworkSettingsValue>) };
          for (const settingId of request.settingIds) {
            delete values[settingId];
          }
          storage.setStorageSync(key, values);
        }
      } catch {
        storage.removeStorageSync(key);
      }
    },
  };
}

/**
 * Single mini-program bootstrap: environment selection, the generated app SDK
 * client, the console ports, the translator, and the shared settings center.
 */
export interface CloudRouterMpRuntime {
  readonly locale: SdkworkConsoleLocale;
  readonly translate: (key: string) => string;
  readonly consolePorts: ReturnType<typeof createCloudRouterMpConsolePorts>;
  readonly webPublicHttpUrl: string;
  readonly settingsBinding: SdkworkMiniProgramSettingsBinding;
  readonly settingsRuntime: SdkworkSettingsRuntime;
}

export function bootstrapMiniProgramApplication(): CloudRouterMpRuntime {
  const environment = resolveRuntimeEnv();
  const locale = resolveConsoleLocale();
  const settingsCatalog = createMiniSettingsCatalog();
  const settingsRuntime = createSdkworkSettingsRuntime({
    autoLoad: true,
    catalog: settingsCatalog,
    query: {
      appId: 'sdkwork-cloudrouter-mini-program',
      scope: 'user',
      userId: 'local',
    },
    store: createMiniSettingsStore(),
  });
  return {
    locale,
    translate: createConsoleTranslator(locale),
    consolePorts: createCloudRouterMpConsolePorts(environment.appApiBaseUrl),
    webPublicHttpUrl: environment.webPublicHttpUrl,
    settingsBinding: createSdkworkMiniProgramSettingsBinding(settingsRuntime, {
      catalog: settingsCatalog,
      locale,
    }),
    settingsRuntime,
  };
}
