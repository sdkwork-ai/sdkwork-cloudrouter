import '../models/console_api_keys_models.dart';

/// Package-local state slice for the api_keys capability.
///
/// Sensitive state must clear on logout and account/tenant switch.
class ConsoleApiKeysState {
  const ConsoleApiKeysState({
    required this.items,
    required this.loading,
    required this.errorMessage,
  });

  final List<ConsoleApiKeysItem> items;
  final bool loading;
  final String errorMessage;

  ConsoleApiKeysState copyWith({
    List<ConsoleApiKeysItem>? items,
    bool? loading,
    String? errorMessage,
  }) {
    return ConsoleApiKeysState(
      items: items ?? this.items,
      loading: loading ?? this.loading,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

ConsoleApiKeysState initialConsoleApiKeysState() {
  return const ConsoleApiKeysState(
    items: <ConsoleApiKeysItem>[],
    loading: true,
    errorMessage: '',
  );
}
