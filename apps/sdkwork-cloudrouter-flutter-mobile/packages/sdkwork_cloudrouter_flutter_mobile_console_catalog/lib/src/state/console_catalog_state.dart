import '../models/console_catalog_models.dart';

/// Package-local state slice for the catalog capability.
///
/// Sensitive state must clear on logout and account/tenant switch.
class ConsoleCatalogState {
  const ConsoleCatalogState({
    required this.items,
    required this.loading,
    required this.errorMessage,
  });

  final List<ConsoleCatalogItem> items;
  final bool loading;
  final String errorMessage;

  ConsoleCatalogState copyWith({
    List<ConsoleCatalogItem>? items,
    bool? loading,
    String? errorMessage,
  }) {
    return ConsoleCatalogState(
      items: items ?? this.items,
      loading: loading ?? this.loading,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

ConsoleCatalogState initialConsoleCatalogState() {
  return const ConsoleCatalogState(
    items: <ConsoleCatalogItem>[],
    loading: true,
    errorMessage: '',
  );
}
