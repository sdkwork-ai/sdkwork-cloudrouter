import '../models/console_api_keys_models.dart';

/// Package-local state slice for the api_keys capability.
///
/// Sensitive state must clear on logout and account/tenant switch.
class ConsoleApiKeysState {
  const ConsoleApiKeysState({
    required this.items,
    required this.loading,
    required this.errorMessage,
    required this.creating,
    required this.createdSecret,
    required this.revokingId,
    required this.notice,
  });

  final List<ConsoleApiKeySummary> items;
  final bool loading;
  final String errorMessage;

  /// True while a create request is in flight.
  final bool creating;

  /// One-time plaintext secret returned by a successful create; shown once.
  final String createdSecret;

  /// Id of the key currently being revoked, or empty when none.
  final String revokingId;

  /// Non-fatal notice (for example a declared transport gap) shown above the list.
  final String notice;

  ConsoleApiKeysState copyWith({
    List<ConsoleApiKeySummary>? items,
    bool? loading,
    String? errorMessage,
    bool? creating,
    String? createdSecret,
    String? revokingId,
    String? notice,
  }) {
    return ConsoleApiKeysState(
      items: items ?? this.items,
      loading: loading ?? this.loading,
      errorMessage: errorMessage ?? this.errorMessage,
      creating: creating ?? this.creating,
      createdSecret: createdSecret ?? this.createdSecret,
      revokingId: revokingId ?? this.revokingId,
      notice: notice ?? this.notice,
    );
  }
}

ConsoleApiKeysState initialConsoleApiKeysState() {
  return const ConsoleApiKeysState(
    items: <ConsoleApiKeySummary>[],
    loading: true,
    errorMessage: '',
    creating: false,
    createdSecret: '',
    revokingId: '',
    notice: '',
  );
}
