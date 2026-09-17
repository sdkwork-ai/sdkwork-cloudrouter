import '../models/console_usage_models.dart';

/// Package-local state slice for the usage capability.
///
/// Sensitive state must clear on logout and account/tenant switch.
class ConsoleUsageState {
  const ConsoleUsageState({
    required this.items,
    required this.loading,
    required this.errorMessage,
  });

  final List<ConsoleUsageItem> items;
  final bool loading;
  final String errorMessage;

  ConsoleUsageState copyWith({
    List<ConsoleUsageItem>? items,
    bool? loading,
    String? errorMessage,
  }) {
    return ConsoleUsageState(
      items: items ?? this.items,
      loading: loading ?? this.loading,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

ConsoleUsageState initialConsoleUsageState() {
  return const ConsoleUsageState(
    items: <ConsoleUsageItem>[],
    loading: true,
    errorMessage: '',
  );
}
