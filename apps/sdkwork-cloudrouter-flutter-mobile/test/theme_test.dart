import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_commons/sdkwork_cloudrouter_flutter_mobile_commons.dart';

void main() {
  test('Flutter theme follows the H5 light tech-blue palette', () {
    final theme = buildSdkworkCloudRouterTheme();
    expect(theme.colorScheme.brightness, Brightness.light);
    expect(theme.colorScheme.primary.toARGB32(), 0xFF2563EB);
    expect(theme.scaffoldBackgroundColor.toARGB32(), 0xFFF5F7FB);
    expect(theme.appBarTheme.backgroundColor?.toARGB32(), 0xFFFFFFFF);
    expect(theme.navigationBarTheme.backgroundColor?.toARGB32(), 0xFFFFFFFF);
    expect(theme.navigationBarTheme.indicatorColor?.toARGB32(), 0xFFDBEAFE);
  });

  test('theme preference maps to Flutter ThemeMode like the H5 setting', () {
    expect(cloudRouterThemeModeFromPreference('light'), ThemeMode.light);
    expect(cloudRouterThemeModeFromPreference('dark'), ThemeMode.dark);
    expect(cloudRouterThemeModeFromPreference('system'), ThemeMode.system);
    expect(cloudRouterThemeModeFromPreference(null), ThemeMode.system);
    expect(cloudRouterThemePreferenceFromMode(ThemeMode.dark), 'dark');
    expect(cloudRouterThemePreferenceFromMode(ThemeMode.light), 'light');
    expect(cloudRouterThemePreferenceFromMode(ThemeMode.system), 'system');
  });
}
