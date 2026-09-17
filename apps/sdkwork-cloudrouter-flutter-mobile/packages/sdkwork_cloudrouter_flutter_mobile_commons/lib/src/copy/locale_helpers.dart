/// Thin locale helpers for the cloudrouter Flutter mobile capability family.
///
/// Placement note (`I18N_SPEC.md` section 6.1): the authored Flutter fragment
/// layout is `lib/src/i18n/<locale>/<domain>/<capability>/<screen-or-widget>.arb`
/// or `.json` — `.dart` is not an authored fragment extension. Dart code that
/// normalizes a locale or looks a key up in an already-loaded fragment is a
/// boundary helper, not a locale resource, so it lives outside `lib/src/i18n/`.
/// The `gen_l10n` projection requires the Flutter toolchain and is declared as a
/// pending integration in `sdkwork.app.config.json#artifacts.installConfig.metadata`.
enum SdkworkCloudRouterLocale { enUs, zhCn }

SdkworkCloudRouterLocale normalizeSdkworkCloudRouterLocale(String value) {
  final normalized = value.trim().toLowerCase();
  return normalized.startsWith('zh')
      ? SdkworkCloudRouterLocale.zhCn
      : SdkworkCloudRouterLocale.enUs;
}

String pickSdkworkCloudRouterMessage(
  Map<String, String> messages,
  String key,
  String fallback,
) {
  final value = messages[key];
  return value != null && value.isNotEmpty ? value : fallback;
}
