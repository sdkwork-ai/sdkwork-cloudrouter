import 'package:sdkwork_cloudrouter_flutter_mobile_commons/sdkwork_cloudrouter_flutter_mobile_commons.dart';

/// Authored message keys for the catalog capability.
///
/// Fragment delivery follows `I18N_SPEC.md`: the `.arb` projection requires the
/// Flutter toolchain and is declared pending in the app manifest. Until then the
/// keys below are the single source the screens read.
class ConsoleCatalogMessages {
  const ConsoleCatalogMessages._();

  static const String titleKey = 'cloudrouter.console.catalog.title';
  static const String loading = 'Loading';
  static const String empty = 'No records';
  static const String reload = 'Reload';

  static Map<String, String> enUs() => <String, String>{
        titleKey: 'catalog',
        loadingKey(titleKey): loading,
        emptyKey(titleKey): empty,
        reloadKey(titleKey): reload,
      };

  static Map<String, String> zhCn() => <String, String>{
        titleKey: 'catalog',
        loadingKey(titleKey): '加载中',
        emptyKey(titleKey): '暂无记录',
        reloadKey(titleKey): '重新加载',
      };

  static String loadingKey(String key) => key + '.loading';
  static String emptyKey(String key) => key + '.empty';
  static String reloadKey(String key) => key + '.reload';

  static String resolve(
    SdkworkCloudRouterLocale locale,
    Map<String, String> messages,
    String key,
    String fallback,
  ) {
    return pickSdkworkCloudRouterMessage(messages, key, fallback);
  }
}
