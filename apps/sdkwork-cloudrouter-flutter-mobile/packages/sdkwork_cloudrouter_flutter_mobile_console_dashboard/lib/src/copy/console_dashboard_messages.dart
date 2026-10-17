import 'package:sdkwork_cloudrouter_flutter_mobile_commons/sdkwork_cloudrouter_flutter_mobile_commons.dart';

/// Authored copy for the dashboard capability.
///
/// Keys mirror the `cloudrouter.console.dashboard.*` fragments authored for the
/// H5 and mini-program roots. Fragment delivery follows `I18N_SPEC.md`: the
/// `.arb` projection requires the Flutter toolchain and is declared pending in
/// the app manifest; until then this record is the single source the screen
/// reads.
class ConsoleDashboardCopy {
  const ConsoleDashboardCopy({
    required this.title,
    required this.requests,
    required this.tokens,
    required this.cost,
    required this.errorRate,
    required this.loading,
    required this.empty,
    required this.reload,
  });

  final String title;
  final String requests;
  final String tokens;
  final String cost;
  final String errorRate;
  final String loading;
  final String empty;
  final String reload;
}

class ConsoleDashboardMessages {
  const ConsoleDashboardMessages._();

  static const String titleKey = 'cloudrouter.console.dashboard.title';

  static ConsoleDashboardCopy enUs() => const ConsoleDashboardCopy(
        title: 'Overview',
        requests: 'Requests',
        tokens: 'Tokens',
        cost: 'Total cost',
        errorRate: 'Error rate',
        loading: 'Loading…',
        empty: 'No data',
        reload: 'Retry',
      );

  static ConsoleDashboardCopy zhCn() => const ConsoleDashboardCopy(
        title: '概览',
        requests: '请求总数',
        tokens: 'Token 总数',
        cost: '累计花费',
        errorRate: '错误率',
        loading: '加载中…',
        empty: '暂无数据',
        reload: '重试',
      );

  static ConsoleDashboardCopy resolve(SdkworkCloudRouterLocale locale) {
    return locale == SdkworkCloudRouterLocale.zhCn ? zhCn() : enUs();
  }
}
