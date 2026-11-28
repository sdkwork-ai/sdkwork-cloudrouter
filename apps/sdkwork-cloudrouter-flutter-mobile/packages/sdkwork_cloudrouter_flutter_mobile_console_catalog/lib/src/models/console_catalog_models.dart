import 'package:sdkwork_cloudrouter_flutter_mobile_commons/sdkwork_cloudrouter_flutter_mobile_commons.dart';

/// Read-model projection for the catalog capability.
///
/// Projects the generated `pricing.rates.list` payload (`OfficialPricingRate`
/// rows, one per meter) into the model/vendor rows this screen renders: rates of
/// the same model and vendor are grouped so the input and output meters land on
/// one row. The projection reads the payload defensively and never assumes a
/// field exists.
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
    id: readNonEmptyString(
          record,
          const <String>['rateCode', 'id', 'rateId', 'modelId', 'code'],
        ) ??
        'unknown',
    vendor: readNonEmptyString(
          record,
          const <String>['vendorCode', 'vendor', 'provider'],
        ) ??
        'unknown',
    model: readNonEmptyString(
          record,
          const <String>[
            'productDisplayName',
            'catalogKey',
            'productCode',
            'model',
            'modelName',
            'modelCode',
          ],
        ) ??
        'unknown',
    inputPricePerMillionTokens: _decimal(record['unitPrice']) ??
        readFiniteNumber(
          record,
          const <String>[
            'inputPricePerMillionTokens',
            'inputPrice',
            'promptPrice',
          ],
        ),
    outputPricePerMillionTokens: readFiniteNumber(
      record,
      const <String>[
        'outputPricePerMillionTokens',
        'outputPrice',
        'completionPrice',
      ],
    ),
    currency:
        readNonEmptyString(record, const <String>['currencyCode', 'currency']) ??
            'CNY',
    unit: readNonEmptyString(
          record,
          const <String>['meterDisplayName', 'unitCode', 'unit', 'priceUnit'],
        ) ??
        '1M tokens',
  );
}

ConsoleCatalogPage toConsoleCatalogPage(Object? payload, {int page = 1, int pageSize = 20}) {
  final data = readRecord(payload, const <String>['data']) ?? toRecord(payload);
  final items = _groupRates(readCollection(data));
  final meta = readRecord(data, const <String>['pageInfo', 'page', 'pagination']) ??
      const <String, Object?>{};
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

/// Collapses the per-meter rates into one row per model and vendor.
List<ConsoleCatalogRateRow> _groupRates(List<Object?> payloads) {
  final rows = <String, _CatalogRowBuilder>{};
  for (final payload in payloads) {
    final record = toRecord(payload);
    if (record.isEmpty) continue;
    final vendor =
        readNonEmptyString(record, const <String>['vendorCode', 'vendor']) ?? 'unknown';
    final model = readNonEmptyString(
          record,
          const <String>['productDisplayName', 'catalogKey', 'productCode', 'model'],
        ) ??
        'unknown';
    final builder = rows.putIfAbsent(
      '$vendor\u0000$model',
      () => _CatalogRowBuilder(
        id: readNonEmptyString(record, const <String>['rateCode', 'id']) ?? model,
        vendor: vendor,
        model: model,
        currency:
            readNonEmptyString(record, const <String>['currencyCode', 'currency']) ?? 'CNY',
        unit: readNonEmptyString(
              record,
              const <String>['meterDisplayName', 'unitCode'],
            ) ??
            '1M tokens',
      ),
    );
    builder.addRate(record);
  }
  return rows.values
      .map((builder) => builder.toRow())
      .toList(growable: false);
}

class _CatalogRowBuilder {
  _CatalogRowBuilder({
    required this.id,
    required this.vendor,
    required this.model,
    required this.currency,
    required this.unit,
  });

  final String id;
  final String vendor;
  final String model;
  final String currency;
  final String unit;
  double? input;
  double? output;

  /// Classifies the meter so the input and output meters of one model stay on
  /// the same row; an unclassified meter fills whichever column is still empty.
  void addRate(Map<String, Object?> record) {
    final price = _decimal(record['unitPrice']);
    if (price == null) return;
    final meter = <String?>[
      readNonEmptyString(record, const <String>['meterCode']),
      readNonEmptyString(record, const <String>['meterDisplayName']),
      readNonEmptyString(record, const <String>['quantityKind']),
      readNonEmptyString(record, const <String>['operationDisplayName']),
    ].whereType<String>().join(' ').toLowerCase();
    if (meter.contains('output') ||
        meter.contains('completion') ||
        meter.contains('generat')) {
      output ??= price;
      return;
    }
    if (meter.contains('input') || meter.contains('prompt')) {
      input ??= price;
      return;
    }
    if (input == null) {
      input = price;
    } else {
      output ??= price;
    }
  }

  ConsoleCatalogRateRow toRow() {
    return ConsoleCatalogRateRow(
      id: id,
      vendor: vendor,
      model: model,
      inputPricePerMillionTokens: input,
      outputPricePerMillionTokens: output,
      currency: currency,
      unit: unit,
    );
  }
}

double? _decimal(Object? value) {
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value.trim());
  return null;
}
