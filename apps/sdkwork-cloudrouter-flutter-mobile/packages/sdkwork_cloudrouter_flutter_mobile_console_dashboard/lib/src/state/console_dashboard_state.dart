import '../models/console_dashboard_models.dart';

/// Package-local state slice for the dashboard capability.
///
/// Sensitive state must clear on logout and account/tenant switch.
class ConsoleDashboardState {
  const ConsoleDashboardState({
    required this.snapshot,
    required this.loading,
    required this.errorMessage,
  });

  final ConsoleDashboardSnapshot? snapshot;
  final bool loading;
  final String errorMessage;

  ConsoleDashboardState copyWith({
    ConsoleDashboardSnapshot? snapshot,
    bool? loading,
    String? errorMessage,
  }) {
    return ConsoleDashboardState(
      snapshot: snapshot ?? this.snapshot,
      loading: loading ?? this.loading,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

ConsoleDashboardState initialConsoleDashboardState() {
  return const ConsoleDashboardState(
    snapshot: null,
    loading: true,
    errorMessage: '',
  );
}
