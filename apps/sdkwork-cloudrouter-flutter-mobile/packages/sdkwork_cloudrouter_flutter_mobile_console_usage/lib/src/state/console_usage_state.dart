import '../models/console_usage_models.dart';

/// Package-local state slice for the usage capability.
///
/// Sensitive state must clear on logout and account/tenant switch.
class ConsoleUsageState {
  const ConsoleUsageState({
    required this.items,
    required this.page,
    required this.hasMore,
    required this.loading,
    required this.loadingMore,
    required this.errorMessage,
    required this.notice,
  });

  final List<ConsoleUsageRecord> items;
  final int page;
  final bool hasMore;
  final bool loading;
  final bool loadingMore;
  final String errorMessage;

  /// Non-fatal notice (for example a declared transport gap) shown above the list.
  final String notice;

  ConsoleUsageState copyWith({
    List<ConsoleUsageRecord>? items,
    int? page,
    bool? hasMore,
    bool? loading,
    bool? loadingMore,
    String? errorMessage,
    String? notice,
  }) {
    return ConsoleUsageState(
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

ConsoleUsageState initialConsoleUsageState() {
  return const ConsoleUsageState(
    items: <ConsoleUsageRecord>[],
    page: 1,
    hasMore: false,
    loading: true,
    loadingMore: false,
    errorMessage: '',
    notice: '',
  );
}
