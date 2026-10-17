/// Defensive payload readers shared by the console capability packages.
///
/// The generated Dart transport returns untyped result objects, so every
/// capability projection reads the payload defensively and never assumes a
/// field exists. These helpers mirror
/// `sdkwork-cloudrouter-service/src/read/record.ts` byte-for-byte in semantics
/// so every client root normalizes the same wire shapes identically.
library;

Map<String, Object?>? _asRecord(Object? value) {
  if (value is Map) {
    return value.cast<String, Object?>();
  }
  return null;
}

/// Reads the first key that yields a plain object; falls back to the source.
Map<String, Object?>? readRecord(Object? source, List<String> keys) {
  final record = _asRecord(source);
  if (record == null) return null;
  for (final key in keys) {
    final candidate = _asRecord(record[key]);
    if (candidate != null) return candidate;
  }
  return record;
}

/// Reads the first key that yields a finite number; also parses numeric strings.
double? readFiniteNumber(Object? source, List<String> keys) {
  final record = _asRecord(source);
  if (record == null) return null;
  for (final key in keys) {
    final value = record[key];
    if (value is num && value.isFinite) return value.toDouble();
    if (value is String && value.trim().isNotEmpty) {
      final parsed = double.tryParse(value);
      if (parsed != null && parsed.isFinite) return parsed;
    }
  }
  return null;
}

/// Reads the first key that yields a non-empty trimmed string.
String? readNonEmptyString(Object? source, List<String> keys) {
  final record = _asRecord(source);
  if (record == null) return null;
  for (final key in keys) {
    final value = record[key];
    if (value is String && value.trim().isNotEmpty) return value.trim();
    if (value is num && value.isFinite) return value.toString();
  }
  return null;
}

/// Reads the first key that yields a boolean; also parses "true"/"false".
bool? readBoolean(Object? source, List<String> keys) {
  final record = _asRecord(source);
  if (record == null) return null;
  for (final key in keys) {
    final value = record[key];
    if (value is bool) return value;
    if (value == 'true') return true;
    if (value == 'false') return false;
  }
  return null;
}

/// Unwraps the collection of any SDKWork response envelope shape.
List<Object?> readCollection(Object? payload, [List<String>? keys]) {
  final candidates = keys ?? const <String>['items', 'records', 'list', 'data', 'results'];
  if (payload is List) return payload;
  final record = _asRecord(payload);
  if (record == null) return const <Object?>[];
  for (final key in candidates) {
    final value = record[key];
    if (value is List) return value;
    final nested = _asRecord(value);
    if (nested != null) {
      for (final nestedKey in candidates) {
        final nestedValue = nested[nestedKey];
        if (nestedValue is List) return nestedValue;
      }
    }
  }
  return const <Object?>[];
}

/// Coerces any value into a record map.
Map<String, Object?> toRecord(Object? value) {
  final record = _asRecord(value);
  return record == null ? const <String, Object?>{} : record;
}
