/**
 * Cloud Router H5 settings adapter.
 *
 * The shared `@sdkwork/settings-mobile-react` component owns the presentation
 * (list/detail, search, controls, i18n); `@sdkwork/settings-core` owns the
 * catalog/runtime/store. This adapter only declares the Cloud Router appearance
 * catalog and applies the selected theme through the host theme system.
 */

export { SettingsScreen } from "./SettingsScreen";
export type { SettingsScreenProps, ThemePreference } from "./SettingsScreen";
