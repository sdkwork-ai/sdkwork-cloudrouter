import 'package:flutter/material.dart';

/// Domain-neutral design tokens for the SDKWork CloudRouter Flutter mobile root.
///
/// Authority: `APP_FLUTTER_UI_SPEC.md`. Shared packages must not import
/// application app shells. Values follow the Cloud Router console surface so the
/// Flutter root stays visually aligned with the H5 root: light canvas, white
/// surfaces, tech-blue accent, slate text ramp.
class SdkworkCloudRouterFlutterTokens {
  const SdkworkCloudRouterFlutterTokens._();

  static const int colorPrimary = 0xFF2563EB;
  static const int colorAccent = 0xFF2563EB;
  static const int colorBackground = 0xFFF5F7FB;
  static const int colorSurface = 0xFFFFFFFF;
  static const int colorSurfaceRaised = 0xFFFFFFFF;
  static const int colorOutline = 0xFFE2E8F0;
  static const int colorText = 0xFF0F172A;
  static const int colorTextMuted = 0xFF64748B;
  static const int colorDanger = 0xFFB91C1C;
  static const int colorSuccess = 0xFF16A34A;

  static const double spacingSm = 8;
  static const double spacingMd = 16;
  static const double spacingLg = 24;

  /// Documented surface content inset (0.9rem at the default text scale).
  static const double contentInset = 14.4;
}

/// Builds the light app theme from the shared tokens; domain packages never
/// redefine global themes (`APP_FLUTTER_UI_SPEC.md` section 5).
ThemeData buildSdkworkCloudRouterTheme() {
  const colorScheme = ColorScheme.light(
    primary: Color(SdkworkCloudRouterFlutterTokens.colorAccent),
    onPrimary: Color(0xFFFFFFFF),
    secondary: Color(SdkworkCloudRouterFlutterTokens.colorAccent),
    onSecondary: Color(0xFFFFFFFF),
    surface: Color(SdkworkCloudRouterFlutterTokens.colorSurface),
    onSurface: Color(SdkworkCloudRouterFlutterTokens.colorText),
    error: Color(SdkworkCloudRouterFlutterTokens.colorDanger),
    onError: Color(0xFFFFFFFF),
    outline: Color(SdkworkCloudRouterFlutterTokens.colorOutline),
  );
  return ThemeData(
    useMaterial3: true,
    colorScheme: colorScheme,
    scaffoldBackgroundColor: const Color(SdkworkCloudRouterFlutterTokens.colorBackground),
    appBarTheme: const AppBarTheme(
      backgroundColor: Color(SdkworkCloudRouterFlutterTokens.colorSurface),
      foregroundColor: Color(SdkworkCloudRouterFlutterTokens.colorText),
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      centerTitle: true,
    ),
    dividerTheme: const DividerThemeData(
      color: Color(SdkworkCloudRouterFlutterTokens.colorOutline),
      thickness: 1,
      space: 1,
    ),
    cardTheme: const CardThemeData(
      color: Color(SdkworkCloudRouterFlutterTokens.colorSurfaceRaised),
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      margin: EdgeInsets.zero,
    ),
    listTileTheme: const ListTileThemeData(
      iconColor: Color(SdkworkCloudRouterFlutterTokens.colorTextMuted),
      textColor: Color(SdkworkCloudRouterFlutterTokens.colorText),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: const Color(SdkworkCloudRouterFlutterTokens.colorSurface),
      indicatorColor: const Color(0xFFDBEAFE),
      labelTextStyle: WidgetStateProperty.resolveWith<TextStyle?>((states) {
        if (states.contains(WidgetState.selected)) {
          return const TextStyle(
            fontSize: 11,
            color: Color(SdkworkCloudRouterFlutterTokens.colorAccent),
            fontWeight: FontWeight.w600,
          );
        }
        return const TextStyle(
          fontSize: 11,
          color: Color(SdkworkCloudRouterFlutterTokens.colorTextMuted),
        );
      }),
    ),
  );
}

/// Dark counterpart used when `appearance.theme` is `dark` or the system is in
/// dark mode. Keeps the same H5 slate/tech-blue family as the light theme.
ThemeData buildSdkworkCloudRouterDarkTheme() {
  const colorScheme = ColorScheme.dark(
    primary: Color(0xFF38BDF8),
    onPrimary: Color(0xFF0B1220),
    secondary: Color(0xFF38BDF8),
    onSecondary: Color(0xFF0B1220),
    surface: Color(0xFF0F172A),
    onSurface: Color(0xFFF1F5F9),
    error: Color(0xFFFCA5A5),
    onError: Color(0xFF450A0A),
    outline: Color(0xFF1E293B),
  );
  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    colorScheme: colorScheme,
    scaffoldBackgroundColor: const Color(0xFF0B1220),
    appBarTheme: const AppBarTheme(
      backgroundColor: Color(0xFF0F172A),
      foregroundColor: Color(0xFFF1F5F9),
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      centerTitle: true,
    ),
    dividerTheme: const DividerThemeData(
      color: Color(0xFF1E293B),
      thickness: 1,
      space: 1,
    ),
    cardTheme: const CardThemeData(
      color: Color(0xFF131C31),
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      margin: EdgeInsets.zero,
    ),
    listTileTheme: const ListTileThemeData(
      iconColor: Color(0xFF94A3B8),
      textColor: Color(0xFFF1F5F9),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: const Color(0xFF0F172A),
      indicatorColor: const Color(0xFF1E3A8A),
      labelTextStyle: WidgetStateProperty.resolveWith<TextStyle?>((states) {
        if (states.contains(WidgetState.selected)) {
          return const TextStyle(
            fontSize: 11,
            color: Color(0xFF38BDF8),
            fontWeight: FontWeight.w600,
          );
        }
        return const TextStyle(fontSize: 11, color: Color(0xFF94A3B8));
      }),
    ),
  );
}
