import '../models/console_dashboard_models.dart';

/// Package-local state slice for the dashboard capability.
///
/// Sensitive state must clear on logout and account/tenant switch.
class ConsoleDashboardState {
  const ConsoleDashboardState({
    required this.items,
    required this.loading,
    required this.errorMessage,
  });

  final List<ConsoleDashboardItem> items;
  final bool loading;
  final String errorMessage;

  ConsoleDashboardState copyWith({
    List<ConsoleDashboardItem>? items,
    bool? loading,
    String? errorMessage,
  }) {
    return ConsoleDashboardState(
      items: items ?? this.items,
      loading: loading ?? this.loading,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

ConsoleDashboardState initialConsoleDashboardState() {
  return const ConsoleDashboardState(
    items: <ConsoleDashboardItem>[],
    loading: true,
    errorMessage: '',
  );
}
