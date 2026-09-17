/// Read-model projection for the usage capability.
///
/// The generated Dart transport returns untyped result objects, so the
/// projection reads the payload defensively and never assumes a field exists.
class ConsoleUsageItem {
  const ConsoleUsageItem({
    required this.id,
    required this.label,
    required this.value,
  });

  final String id;
  final String label;
  final String value;
}

class ConsoleUsagePage {
  const ConsoleUsagePage({
    required this.items,
    required this.hasMore,
  });

  final List<ConsoleUsageItem> items;
  final bool hasMore;
}

String readConsoleUsageString(Object? source, String key, String fallback) {
  if (source is Map) {
    final value = source[key];
    if (value is String && value.isNotEmpty) {
      return value;
    }
    if (value is num) {
      return value.toString();
    }
  }
  return fallback;
}
