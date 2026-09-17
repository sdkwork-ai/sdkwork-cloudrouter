/// Read-model projection for the catalog capability.
///
/// The generated Dart transport returns untyped result objects, so the
/// projection reads the payload defensively and never assumes a field exists.
class ConsoleCatalogItem {
  const ConsoleCatalogItem({
    required this.id,
    required this.label,
    required this.value,
  });

  final String id;
  final String label;
  final String value;
}

class ConsoleCatalogPage {
  const ConsoleCatalogPage({
    required this.items,
    required this.hasMore,
  });

  final List<ConsoleCatalogItem> items;
  final bool hasMore;
}

String readConsoleCatalogString(Object? source, String key, String fallback) {
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
