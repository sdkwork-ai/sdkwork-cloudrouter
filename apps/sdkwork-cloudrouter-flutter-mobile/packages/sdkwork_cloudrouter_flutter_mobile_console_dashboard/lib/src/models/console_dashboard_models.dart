import 'package:sdkwork_cloudrouter_flutter_mobile_commons/sdkwork_cloudrouter_flutter_mobile_commons.dart';

/// Read-model projection for the dashboard capability.
///
/// Mirrors `toConsoleOverviewSnapshot` from
/// `sdkwork-cloudrouter-service/src/readModels/overview.ts` so the Flutter root
/// renders the same overview numbers as the PC, H5, and mini-program roots. The
/// generated Dart transport returns untyped result objects, so the projection
/// reads the payload defensively and never assumes a field exists.
class ConsoleDashboardSnapshot {
  const ConsoleDashboardSnapshot({
    required this.totalRequests,
    required this.totalTokens,
    required this.costMinorUnits,
    required this.currency,
    required this.errorRate,
    required this.windowLabel,
  });

  final int totalRequests;
  final int totalTokens;
  final int costMinorUnits;
  final String currency;
  final double errorRate;
  final String? windowLabel;
}

const List<String> _overviewKeys = <String>['overview', 'summary', 'statistics', 'metrics', 'data'];

ConsoleDashboardSnapshot projectConsoleDashboardSnapshot(Object? payload) {
  final record = readRecord(payload, _overviewKeys) ?? payload;
  final totalRequests = readFiniteNumber(record, const <String>[
    'totalRequests',
    'requestCount',
    'requests',
    'total_requests',
  ])?.round() ??
      0;
  final promptTokens = readFiniteNumber(record, const <String>['promptTokens', 'inputTokens', 'prompt_tokens']);
  final completionTokens = readFiniteNumber(record, const <String>[
    'completionTokens',
    'outputTokens',
    'completion_tokens',
  ]);
  final totalTokens = readFiniteNumber(record, const <String>['totalTokens', 'tokens', 'total_tokens'])?.round() ??
      ((promptTokens?.round() ?? 0) + (completionTokens?.round() ?? 0));
  final errorCount = readFiniteNumber(record, const <String>['errorCount', 'errors', 'failedRequests']);
  final explicitErrorRate = readFiniteNumber(record, const <String>['errorRate', 'error_rate', 'failureRate']);
  final errorRate =
      explicitErrorRate ?? (errorCount != null && totalRequests > 0 ? errorCount / totalRequests : 0);
  return ConsoleDashboardSnapshot(
    totalRequests: totalRequests,
    totalTokens: totalTokens,
    costMinorUnits: readFiniteNumber(record, const <String>[
      'costMinorUnits',
      'totalCostMinorUnits',
      'cost',
      'totalCost',
    ])?.round() ??
        0,
    errorRate: errorRate,
    currency: readNonEmptyString(record, const <String>['currency', 'currencyCode']) ?? 'CNY',
    windowLabel: readNonEmptyString(record, const <String>['window', 'windowLabel', 'period', 'range']),
  );
}
