import 'package:sdkwork_cloudrouter_flutter_mobile_commons/sdkwork_cloudrouter_flutter_mobile_commons.dart';

/// Authored copy for the catalog capability.
///
/// Keys mirror the `cloudrouter.console.catalog.*` fragments authored for the
/// H5 and mini-program roots. Fragment delivery follows `I18N_SPEC.md`: the
/// `.arb` projection requires the Flutter toolchain and is declared pending in
/// the app manifest; until then this record is the single source the screen
/// reads.
class ConsoleCatalogCopy {
  const ConsoleCatalogCopy({
    required this.title,
    required this.summary,
    required this.columnVendor,
    required this.columnModel,
    required this.columnInput,
    required this.columnOutput,
    required this.loading,
    required this.empty,
    required this.reload,
    required this.loadMore,
  });

  final String title;
  final String summary;
  final String columnVendor;
  final String columnModel;
  final String columnInput;
  final String columnOutput;
  final String loading;
  final String empty;
  final String reload;
  final String loadMore;
}

class ConsoleCatalogMessages {
  const ConsoleCatalogMessages._();

  static const String titleKey = 'cloudrouter.console.catalog.title';

  static ConsoleCatalogCopy enUs() => const ConsoleCatalogCopy(
        title: 'Models & Pricing',
        summary: 'Official model catalog and per-million-token prices',
        columnVendor: 'Vendor',
        columnModel: 'Model',
        columnInput: 'Input price',
        columnOutput: 'Output price',
        loading: 'Loading…',
        empty: 'No data',
        reload: 'Retry',
        loadMore: 'Load more',
      );

  static ConsoleCatalogCopy zhCn() => const ConsoleCatalogCopy(
        title: '模型与定价',
        summary: '官方模型目录与每百万 Token 价格',
        columnVendor: '厂商',
        columnModel: '模型',
        columnInput: '输入价',
        columnOutput: '输出价',
        loading: '加载中…',
        empty: '暂无数据',
        reload: '重试',
        loadMore: '加载更多',
      );

  static ConsoleCatalogCopy resolve(SdkworkCloudRouterLocale locale) {
    return locale == SdkworkCloudRouterLocale.zhCn ? zhCn() : enUs();
  }
}
