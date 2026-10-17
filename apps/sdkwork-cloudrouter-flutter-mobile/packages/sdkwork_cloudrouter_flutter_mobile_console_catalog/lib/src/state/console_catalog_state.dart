import '../models/console_catalog_models.dart';

/// Package-local state slice for the catalog capability.
///
/// Sensitive state must clear on logout and account/tenant switch.
class ConsoleCatalogState {
  const ConsoleCatalogState({
    required this.items,
    required this.page,
    required this.hasMore,
    required this.loading,
    required this.loadingMore,
    required this.errorMessage,
    required this.notice,
  });

  final List<ConsoleCatalogRateRow> items;
  final int page;
  final bool hasMore;
  final bool loading;
  final bool loadingMore;
  final String errorMessage;

  /// Non-fatal notice (for example a declared transport gap) shown above the list.
  final String notice;

  ConsoleCatalogState copyWith({
    List<ConsoleCatalogRateRow>? items,
    int? page,
    bool? hasMore,
    bool? loading,
    bool? loadingMore,
    String? errorMessage,
    String? notice,
  }) {
    return ConsoleCatalogState(
      items: items ?? this.items,
      page: page ?? this.page,
      hasMore: hasMore ?? this.hasMore,
      loading: loading ?? this.loading,
      loadingMore: loadingMore ?? this.loadingMore,
      errorMessage: errorMessage ?? this.errorMessage,
      notice: notice ?? this.notice,
    );
  }
}

ConsoleCatalogState initialConsoleCatalogState() {
  return const ConsoleCatalogState(
    items: <ConsoleCatalogRateRow>[],
    page: 1,
    hasMore: false,
    loading: true,
    loadingMore: false,
    errorMessage: '',
    notice: '',
  );
}
