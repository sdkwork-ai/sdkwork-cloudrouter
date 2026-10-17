import 'package:sdkwork_cloudrouter_flutter_mobile_commons/sdkwork_cloudrouter_flutter_mobile_commons.dart';

/// Authored copy for the usage capability.
///
/// Keys mirror the `cloudrouter.console.usage.*` fragments authored for the H5
/// and mini-program roots. Fragment delivery follows `I18N_SPEC.md`: the `.arb`
/// projection requires the Flutter toolchain and is declared pending in the app
/// manifest; until then this record is the single source the screen reads.
class ConsoleUsageCopy {
  const ConsoleUsageCopy({
    required this.title,
    required this.columnModel,
    required this.columnTokens,
    required this.columnCost,
    required this.columnStatus,
    required this.columnTime,
    required this.statusSucceeded,
    required this.statusFailed,
    required this.statusProcessing,
    required this.statusUnknown,
    required this.loading,
    required this.empty,
    required this.reload,
    required this.loadMore,
  });

  final String title;
  final String columnModel;
  final String columnTokens;
  final String columnCost;
  final String columnStatus;
  final String columnTime;
  final String statusSucceeded;
  final String statusFailed;
  final String statusProcessing;
  final String statusUnknown;
  final String loading;
  final String empty;
  final String reload;
  final String loadMore;
}

class ConsoleUsageMessages {
  const ConsoleUsageMessages._();

  static const String titleKey = 'cloudrouter.console.usage.title';

  static ConsoleUsageCopy enUs() => const ConsoleUsageCopy(
        title: 'Usage',
        columnModel: 'Model',
        columnTokens: 'Tokens',
        columnCost: 'Cost',
        columnStatus: 'Status',
        columnTime: 'Time',
        statusSucceeded: 'Succeeded',
        statusFailed: 'Failed',
        statusProcessing: 'Processing',
        statusUnknown: 'Unknown',
        loading: 'Loading…',
        empty: 'No data',
        reload: 'Retry',
        loadMore: 'Load more',
      );

  static ConsoleUsageCopy zhCn() => const ConsoleUsageCopy(
        title: '用量',
        columnModel: '模型',
        columnTokens: 'Token',
        columnCost: '费用',
        columnStatus: '状态',
        columnTime: '时间',
        statusSucceeded: '成功',
        statusFailed: '失败',
        statusProcessing: '处理中',
        statusUnknown: '未知',
        loading: '加载中…',
        empty: '暂无数据',
        reload: '重试',
        loadMore: '加载更多',
      );

  static ConsoleUsageCopy resolve(SdkworkCloudRouterLocale locale) {
    return locale == SdkworkCloudRouterLocale.zhCn ? zhCn() : enUs();
  }
}
