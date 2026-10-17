import 'package:sdkwork_cloudrouter_flutter_mobile_commons/sdkwork_cloudrouter_flutter_mobile_commons.dart';

/// Read-model projection for the api_keys capability.
///
/// Mirrors `toConsoleApiKeySummary` / `toConsoleApiKeyPage` from
/// `sdkwork-cloudrouter-service/src/readModels/apiKeys.ts` so the Flutter root
/// renders the same key rows as the PC, H5, and mini-program roots. The
/// generated Dart transport returns untyped result objects, so the projection
/// reads the payload defensively and never assumes a field exists.
enum ConsoleApiKeyStatus { active, disabled, revoked, unknown }

class ConsoleApiKeySummary {
  const ConsoleApiKeySummary({
    required this.id,
    required this.name,
    required this.maskedKey,
    required this.status,
    required this.createdAt,
    required this.lastUsedAt,
  });

  final String id;
  final String name;
  final String maskedKey;
  final ConsoleApiKeyStatus status;
  final String? createdAt;
  final String? lastUsedAt;
}

class ConsoleApiKeyPage {
  const ConsoleApiKeyPage({
    required this.items,
    required this.page,
    required this.pageSize,
    required this.total,
    required this.hasMore,
  });

  final List<ConsoleApiKeySummary> items;
  final int page;
  final int pageSize;
  final int total;
  final bool hasMore;
}

const Map<String, ConsoleApiKeyStatus> _statusAliases = <String, ConsoleApiKeyStatus>{
  'active': ConsoleApiKeyStatus.active,
  'enabled': ConsoleApiKeyStatus.active,
  'disabled': ConsoleApiKeyStatus.disabled,
  'inactive': ConsoleApiKeyStatus.disabled,
  'revoked': ConsoleApiKeyStatus.revoked,
  'deleted': ConsoleApiKeyStatus.revoked,
};

ConsoleApiKeyStatus toConsoleApiKeyStatus(String? value) {
  if (value == null || value.isEmpty) return ConsoleApiKeyStatus.unknown;
  return _statusAliases[value.toLowerCase()] ?? ConsoleApiKeyStatus.unknown;
}

ConsoleApiKeySummary toConsoleApiKeySummary(Object? payload) {
  final record = toRecord(payload);
  final rawKey = readNonEmptyString(record, const <String>['key', 'apiKey', 'secret', 'token', 'value']);
  final masked = readNonEmptyString(record, const <String>['maskedKey', 'masked', 'obfuscatedKey']);
  return ConsoleApiKeySummary(
    id: readNonEmptyString(record, const <String>['id', 'apiKeyId', 'keyId']) ?? 'unknown',
    name: readNonEmptyString(record, const <String>['name', 'title', 'label']) ?? 'unknown',
    maskedKey: masked ?? (rawKey != null ? maskApiKey(rawKey) : ''),
    status: toConsoleApiKeyStatus(readNonEmptyString(record, const <String>['status', 'state'])),
    createdAt: readNonEmptyString(record, const <String>['createdAt', 'created_at']),
    lastUsedAt: readNonEmptyString(record, const <String>['lastUsedAt', 'last_used_at', 'lastUsed']),
  );
}

/// Reads the one-time plaintext secret from a create response, mirroring
/// `readCreatedSecret` from the mini-program controller: the plaintext is only
/// returned once and must be shown immediately.
String? readCreatedApiKeySecret(Object? payload) {
  final record = toRecord(payload);
  return readNonEmptyString(record, const <String>['key', 'apiKey', 'secret', 'token']) ??
      readNonEmptyString(toRecord(record['data']), const <String>['key', 'apiKey', 'secret', 'token']);
}

ConsoleApiKeyPage toConsoleApiKeyPage(Object? payload, {int page = 1, int pageSize = 20}) {
  final items = readCollection(payload).map(toConsoleApiKeySummary).toList(growable: false);
  final meta = readRecord(payload, const <String>['page', 'pagination', 'pageInfo']) ?? const <String, Object?>{};
  final resolvedPageSize =
      readFiniteNumber(meta, const <String>['pageSize', 'size', 'limit'])?.round() ??
          (pageSize == 0 ? items.length : pageSize);
  final resolvedPage = readFiniteNumber(meta, const <String>['page', 'pageNumber', 'current'])?.round() ?? page;
  final total = readFiniteNumber(meta, const <String>['total', 'totalCount', 'count'])?.round() ?? items.length;
  final nextCursor = readNonEmptyString(meta, const <String>['nextCursor', 'next_cursor']);
  final hasMore = readBoolean(meta, const <String>['hasMore', 'has_more']) ??
      (nextCursor != null || resolvedPage * resolvedPageSize < total);
  return ConsoleApiKeyPage(
    items: items,
    page: resolvedPage,
    pageSize: resolvedPageSize,
    total: total,
    hasMore: hasMore,
  );
}
