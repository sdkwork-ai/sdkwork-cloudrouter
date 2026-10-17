import 'package:flutter/material.dart';

/// Domain-neutral design tokens for the SDKWork CloudRouter Flutter mobile root.
///
/// Authority: `APP_FLUTTER_UI_SPEC.md`. Shared packages must not import
/// application app shells. Values follow the Cloud Router console surface so the
/// Flutter root stays visually aligned with the PC, H5, and mini-program roots
/// (deep navy surfaces, sky accent, slate text ramp).
class SdkworkCloudRouterFlutterTokens {
  const SdkworkCloudRouterFlutterTokens._();

  static const int colorPrimary = 0xFF0F172A;
  static const int colorAccent = 0xFF38BDF8;
  static const int colorBackground = 0xFF0B1220;
  static const int colorSurface = 0xFF0F172A;
  static const int colorSurfaceRaised = 0xFF131C31;
  static const int colorOutline = 0xFF1E293B;
  static const int colorText = 0xFFF1F5F9;
  static const int colorTextMuted = 0xFF94A3B8;
  static const int colorDanger = 0xFFFCA5A5;
  static const int colorSuccess = 0xFF4ADE80;

  static const double spacingSm = 8;
  static const double spacingMd = 16;
  static const double spacingLg = 24;

  /// Documented surface content inset (0.9rem at the default text scale).
  static const double contentInset = 14.4;
}

/// Builds the app theme from the shared tokens; domain packages never redefine
/// global themes (`APP_FLUTTER_UI_SPEC.md` section 5).
ThemeData buildSdkworkCloudRouterTheme() {
  const colorScheme = ColorScheme.dark(
    primary: Color(SdkworkCloudRouterFlutterTokens.colorAccent),
    onPrimary: Color(0xFF0B1220),
    secondary: Color(SdkworkCloudRouterFlutterTokens.colorAccent),
    surface: Color(SdkworkCloudRouterFlutterTokens.colorSurface),
    onSurface: Color(SdkworkCloudRouterFlutterTokens.colorText),
    error: Color(SdkworkCloudRouterFlutterTokens.colorDanger),
    outline: Color(SdkworkCloudRouterFlutterTokens.colorOutline),
  );
  return ThemeData(
    useMaterial3: true,
    colorScheme: colorScheme,
    scaffoldBackgroundColor: const Color(SdkworkCloudRouterFlutterTokens.colorBackground),
    appBarTheme: const AppBarTheme(
      backgroundColor: Color(SdkworkCloudRouterFlutterTokens.colorPrimary),
      foregroundColor: Color(SdkworkCloudRouterFlutterTokens.colorText),
      elevation: 0,
      centerTitle: false,
    ),
    dividerTheme: const DividerThemeData(
      color: Color(SdkworkCloudRouterFlutterTokens.colorOutline),
      thickness: 1,
      space: 1,
    ),
    cardTheme: const CardThemeData(
      color: Color(SdkworkCloudRouterFlutterTokens.colorSurfaceRaised),
      elevation: 0,
      margin: EdgeInsets.zero,
    ),
    listTileTheme: const ListTileThemeData(
      iconColor: Color(SdkworkCloudRouterFlutterTokens.colorTextMuted),
      textColor: Color(SdkworkCloudRouterFlutterTokens.colorText),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: const Color(SdkworkCloudRouterFlutterTokens.colorPrimary),
      indicatorColor: const Color(SdkworkCloudRouterFlutterTokens.colorAccent),
      labelTextStyle: WidgetStateProperty.resolveWith<TextStyle?>((states) {
        if (states.contains(WidgetState.selected)) {
          return const TextStyle(
            fontSize: 11,
            color: Color(SdkworkCloudRouterFlutterTokens.colorText),
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
