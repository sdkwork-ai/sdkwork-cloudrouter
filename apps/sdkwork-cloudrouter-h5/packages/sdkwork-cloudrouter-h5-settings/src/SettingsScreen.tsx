import { useEffect, useRef, useState } from "react";

import {
  SdkworkMemorySettingsStore,
  createDefaultSdkworkSettingsCatalog,
  createSdkworkBrowserSettingsStore,
  createSdkworkSettingsCatalog,
  createSdkworkSettingsRuntime,
  type SdkworkSettingsRuntime,
} from "@sdkwork/settings-core";
import {
  SdkworkMobileSettingsProvider,
  SdkworkSettingsMobile,
} from "@sdkwork/settings-mobile-react";

export type ThemePreference = "system" | "light" | "dark";

export interface SettingsScreenProps {
  readonly accountId?: string | null;
  readonly doneLabel?: string;
  readonly description?: string;
  readonly initialTheme: ThemePreference;
  readonly locale?: string;
  readonly onAction?: (settingId: string) => void;
  readonly onBack: () => void;
  readonly onThemeChange: (theme: ThemePreference) => void;
  readonly title?: string;
}

/**
 * Cloud Router settings catalog.
 *
 * The sections and setting definitions come from the shared appbase defaults
 * (appearance, voice, notifications, about); this host only selects the
 * sections it exposes. Voice switching therefore needs no Cloud Router-specific
 * definition: it is part of the shared settings center for every platform.
 */
const CLOUDROUTER_SETTINGS_SECTIONS = new Set([
  "appearance",
  "voice",
  "notifications",
  "about",
]);

const DEFAULT_SETTINGS_CATALOG = createDefaultSdkworkSettingsCatalog();
const SETTINGS_SECTIONS = DEFAULT_SETTINGS_CATALOG.sections.filter((section) =>
  CLOUDROUTER_SETTINGS_SECTIONS.has(section.id),
);
const SETTINGS_SETTINGS = DEFAULT_SETTINGS_CATALOG.settings.filter((setting) =>
  CLOUDROUTER_SETTINGS_SECTIONS.has(setting.sectionId),
);
const SETTINGS_GROUPS = DEFAULT_SETTINGS_CATALOG.groups.filter((group) =>
  SETTINGS_SECTIONS.some((section) => section.groupId === group.id),
);

const APPEARANCE_CATALOG = createSdkworkSettingsCatalog({
  groups: SETTINGS_GROUPS,
  sections: SETTINGS_SECTIONS,
  settings: SETTINGS_SETTINGS,
});

function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

/**
 * Mobile settings center backed by the shared setting catalog/runtime.
 *
 * The host passes the current preference and a setter; persistence stays in the
 * shared runtime's browser store while the host owns document theming.
 */
export function SettingsScreen({
  accountId,
  doneLabel = "完成",
  description,
  initialTheme,
  locale = "zh-CN",
  onAction,
  onBack,
  onThemeChange,
  title = "设置",
}: SettingsScreenProps) {
  const onThemeChangeRef = useRef(onThemeChange);
  onThemeChangeRef.current = onThemeChange;

  const [runtime] = useState<SdkworkSettingsRuntime>(() =>
    createSdkworkSettingsRuntime({
      autoLoad: true,
      catalog: APPEARANCE_CATALOG,
      initialValues: {
        "about.version": "0.1.0",
        "appearance.theme": initialTheme,
      },
      onEvent: (event) => {
        const values =
          event.type === "loaded" || event.type === "saved"
            ? event.values
            : event.type === "changed"
              ? event.change.values
              : null;
        const nextTheme = values?.["appearance.theme"];
        if (isThemePreference(nextTheme)) {
          onThemeChangeRef.current(nextTheme);
        }
      },
      query: {
        appId: "sdkwork-cloudrouter-h5",
        scope: "user",
        ...(accountId ? { userId: accountId } : {}),
      },
      store: createSdkworkBrowserSettingsStore() ?? new SdkworkMemorySettingsStore(),
    }),
  );

  useEffect(() => () => runtime.destroy(), [runtime]);

  return (
    <SdkworkMobileSettingsProvider
      catalog={APPEARANCE_CATALOG}
      locale={locale === "en-US" ? "en-US" : "zh-CN"}
      platform="mobile-react"
      runtime={runtime}
      scope="user"
    >
      <SdkworkSettingsMobile
        actions={
          <button
            type="button"
            onClick={onBack}
            style={{
              background: "transparent",
              border: 0,
              color: "var(--sdk-mobile-settings-brand)",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              padding: "6px 8px",
            }}
          >
            {doneLabel}
          </button>
        }
        description={description}
        initialView="list"
        onAction={onAction}
        showSearch={false}
        title={title}
      />
    </SdkworkMobileSettingsProvider>
  );
}
