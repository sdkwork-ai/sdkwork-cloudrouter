import 'package:sdkwork_cloudrouter_flutter_mobile_commons/sdkwork_cloudrouter_flutter_mobile_commons.dart';

/// Read-model projection for the usage capability.
///
/// Mirrors `toConsoleUsageRecord` / `toConsoleUsagePage` from
/// `sdkwork-cloudrouter-service/src/readModels/usage.ts` so the Flutter root
/// renders the same usage rows as the PC, H5, and mini-program roots. The
/// generated Dart transport returns untyped result objects, so the projection
/// reads the payload defensively and never assumes a field exists.
enum ConsoleUsageStatus { succeeded, failed, processing, unknown }

class ConsoleUsageRecord {
  const ConsoleUsageRecord({
    required this.id,
    required this.model,
    required this.promptTokens,
    required this.completionTokens,
    required this.totalTokens,
    required this.costMinorUnits,
    required this.status,
    required this.occurredAt,
  });

  final String id;
  final String model;
  final int promptTokens;
  final int completionTokens;
  final int totalTokens;
  final int costMinorUnits;
  final ConsoleUsageStatus status;
  final String? occurredAt;
}

class ConsoleUsagePage {
  const ConsoleUsagePage({
    required this.items,
    required this.page,
    required this.pageSize,
    required this.total,
    required this.hasMore,
  });

  final List<ConsoleUsageRecord> items;
  final int page;
  final int pageSize;
  final int total;
  final bool hasMore;
}

const Map<String, ConsoleUsageStatus> _statusAliases = <String, ConsoleUsageStatus>{
  'ok': ConsoleUsageStatus.succeeded,
  'success': ConsoleUsageStatus.succeeded,
  'succeeded': ConsoleUsageStatus.succeeded,
  'completed': ConsoleUsageStatus.succeeded,
  'error': ConsoleUsageStatus.failed,
  'failed': ConsoleUsageStatus.failed,
  'failure': ConsoleUsageStatus.failed,
  'pending': ConsoleUsageStatus.processing,
  'processing': ConsoleUsageStatus.processing,
  'running': ConsoleUsageStatus.processing,
};

ConsoleUsageStatus toConsoleUsageStatus(String? value) {
  if (value == null || value.isEmpty) return ConsoleUsageStatus.unknown;
  return _statusAliases[value.toLowerCase()] ?? ConsoleUsageStatus.unknown;
}

ConsoleUsageRecord toConsoleUsageRecord(Object? payload) {
  final record = toRecord(payload);
  final promptTokens = readFiniteNumber(record, const <String>['promptTokens', 'inputTokens'])?.round() ?? 0;
  final completionTokens =
      readFiniteNumber(record, const <String>['completionTokens', 'outputTokens'])?.round() ?? 0;
  return ConsoleUsageRecord(
    id: readNonEmptyString(record, const <String>['id', 'recordId', 'traceId', 'requestId']) ?? 'unknown',
    model: readNonEmptyString(record, const <String>['model', 'modelName', 'modelCode']) ?? 'unknown',
    promptTokens: promptTokens,
    completionTokens: completionTokens,
    totalTokens: readFiniteNumber(record, const <String>['totalTokens', 'tokens'])?.round() ??
        promptTokens + completionTokens,
    costMinorUnits: readFiniteNumber(record, const <String>['costMinorUnits', 'cost', 'totalCost'])?.round() ?? 0,
    status: toConsoleUsageStatus(readNonEmptyString(record, const <String>['status', 'state', 'result'])),
    occurredAt: readNonEmptyString(record, const <String>['occurredAt', 'createdAt', 'timestamp', 'requestedAt']),
  );
}

ConsoleUsagePage toConsoleUsagePage(Object? payload, {int page = 1, int pageSize = 20}) {
  final items = readCollection(payload).map(toConsoleUsageRecord).toList(growable: false);
  final meta = readRecord(payload, const <String>['page', 'pagination', 'pageInfo']) ?? const <String, Object?>{};
  final resolvedPageSize =
      readFiniteNumber(meta, const <String>['pageSize', 'size', 'limit'])?.round() ??
          (pageSize == 0 ? items.length : pageSize);
  final resolvedPage = readFiniteNumber(meta, const <String>['page', 'pageNumber', 'current'])?.round() ?? page;
  final total = readFiniteNumber(meta, const <String>['total', 'totalCount', 'count'])?.round() ?? items.length;
  final nextCursor = readNonEmptyString(meta, const <String>['nextCursor', 'next_cursor']);
  final hasMore = readBoolean(meta, const <String>['hasMore', 'has_more']) ??
      (nextCursor != null || resolvedPage * resolvedPageSize < total);
  return ConsoleUsagePage(
    items: items,
    page: resolvedPage,
    pageSize: resolvedPageSize,
    total: total,
    hasMore: hasMore,
  );
}
