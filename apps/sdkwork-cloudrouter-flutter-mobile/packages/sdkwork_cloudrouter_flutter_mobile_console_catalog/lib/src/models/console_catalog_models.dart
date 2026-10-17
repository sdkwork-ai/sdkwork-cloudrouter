import 'package:sdkwork_cloudrouter_flutter_mobile_commons/sdkwork_cloudrouter_flutter_mobile_commons.dart';

/// Read-model projection for the catalog capability.
///
/// Mirrors `toConsoleCatalogRateRow` / `toConsoleCatalogPage` from
/// `sdkwork-cloudrouter-service/src/readModels/catalog.ts` so the Flutter root
/// renders the same pricing rows as the PC, H5, and mini-program roots. The
/// generated Dart transport returns untyped result objects, so the projection
/// reads the payload defensively and never assumes a field exists.
class ConsoleCatalogRateRow {
  const ConsoleCatalogRateRow({
    required this.id,
    required this.vendor,
    required this.model,
    required this.inputPricePerMillionTokens,
    required this.outputPricePerMillionTokens,
    required this.currency,
    required this.unit,
  });

  final String id;
  final String vendor;
  final String model;
  final double? inputPricePerMillionTokens;
  final double? outputPricePerMillionTokens;
  final String currency;
  final String unit;
}

class ConsoleCatalogPage {
  const ConsoleCatalogPage({
    required this.items,
    required this.page,
    required this.pageSize,
    required this.total,
    required this.hasMore,
  });

  final List<ConsoleCatalogRateRow> items;
  final int page;
  final int pageSize;
  final int total;
  final bool hasMore;
}

ConsoleCatalogRateRow toConsoleCatalogRateRow(Object? payload) {
  final record = toRecord(payload);
  return ConsoleCatalogRateRow(
    id: readNonEmptyString(record, const <String>['id', 'rateId', 'modelId', 'code']) ?? 'unknown',
    vendor: readNonEmptyString(record, const <String>['vendor', 'provider', 'vendorCode']) ?? 'unknown',
    model: readNonEmptyString(record, const <String>['model', 'modelName', 'modelCode']) ?? 'unknown',
    inputPricePerMillionTokens:
        readFiniteNumber(record, const <String>['inputPricePerMillionTokens', 'inputPrice', 'promptPrice']),
    outputPricePerMillionTokens:
        readFiniteNumber(record, const <String>['outputPricePerMillionTokens', 'outputPrice', 'completionPrice']),
    currency: readNonEmptyString(record, const <String>['currency', 'currencyCode']) ?? 'CNY',
    unit: readNonEmptyString(record, const <String>['unit', 'priceUnit']) ?? '1M tokens',
  );
}

ConsoleCatalogPage toConsoleCatalogPage(Object? payload, {int page = 1, int pageSize = 20}) {
  final items = readCollection(payload).map(toConsoleCatalogRateRow).toList(growable: false);
  final meta = readRecord(payload, const <String>['page', 'pagination', 'pageInfo']) ?? const <String, Object?>{};
  final resolvedPageSize =
      readFiniteNumber(meta, const <String>['pageSize', 'size', 'limit'])?.round() ??
          (pageSize == 0 ? items.length : pageSize);
  final resolvedPage = readFiniteNumber(meta, const <String>['page', 'pageNumber', 'current'])?.round() ?? page;
  final total = readFiniteNumber(meta, const <String>['total', 'totalCount', 'count'])?.round() ?? items.length;
  final nextCursor = readNonEmptyString(meta, const <String>['nextCursor', 'next_cursor']);
  final hasMore = readBoolean(meta, const <String>['hasMore', 'has_more']) ??
      (nextCursor != null || resolvedPage * resolvedPageSize < total);
  return ConsoleCatalogPage(
    items: items,
    page: resolvedPage,
    pageSize: resolvedPageSize,
    total: total,
    hasMore: hasMore,
  );
}
