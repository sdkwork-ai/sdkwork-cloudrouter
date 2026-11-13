import 'package:flutter/material.dart';

/// App-wide theme preference driven by the shared settings `appearance.theme`
/// value. The H5 root uses the same system/light/dark semantics.
final ValueNotifier<ThemeMode> cloudRouterThemeMode =
    ValueNotifier<ThemeMode>(ThemeMode.system);

/// Shared storage key; matches the H5 `cloud-router-theme` preference.
const String cloudRouterThemeStorageKey = 'cloud-router-theme';

ThemeMode cloudRouterThemeModeFromPreference(String? preference) {
  switch (preference) {
    case 'light':
      return ThemeMode.light;
    case 'dark':
      return ThemeMode.dark;
    default:
      return ThemeMode.system;
  }
}

String cloudRouterThemePreferenceFromMode(ThemeMode mode) {
  switch (mode) {
    case ThemeMode.light:
      return 'light';
    case ThemeMode.dark:
      return 'dark';
    case ThemeMode.system:
      return 'system';
  }
}
