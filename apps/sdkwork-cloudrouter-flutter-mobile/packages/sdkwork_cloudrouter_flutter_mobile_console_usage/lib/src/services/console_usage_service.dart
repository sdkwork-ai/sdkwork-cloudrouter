import 'package:sdkwork_cloudrouter_flutter_mobile_core/sdkwork_cloudrouter_flutter_mobile_core.dart';

import '../models/console_usage_models.dart';

/// Reason surfaced when the generated Dart transport cannot express usage
/// pagination.
///
/// The browser roots page through `listUsageLogs(query)`; the generated Dart
/// `usageLogsList()` takes no pagination parameters yet, so only the first page
/// can be loaded. Per `APP_FLUTTER_UI_SPEC.md` section 4 the gap MUST be fixed
/// by regenerating the Dart SDK instead of filling it with raw HTTP calls.
const String generatedDartUsagePaginationGapReason =
    'The generated Dart transport cloudrouter_app_sdk cannot express usage pagination yet: '
    'usageLogsList() takes no page parameters. Regenerate the Dart SDK with query support '
    'before enabling additional pages.';

/// Console request and token usage records.
///
/// The console ports are injected by root bootstrap; this service maps records
/// and owns projection only — it never constructs transport.
///
/// Authority: `FLUTTER_APP_MOBILE_ARCHITECTURE_SPEC.md` section 4 (`services/`).
class ConsoleUsageService {
  const ConsoleUsageService({required this.ports});

  final CloudRouterConsolePorts ports;

  /// Loads the first usage page.
  Future<ConsoleUsagePage> load() async {
    return toConsoleUsagePage(await ports.listUsageLogs(), page: 1, pageSize: pageSize);
  }

  /// Loads a later page; throws [UnsupportedError] until the Dart SDK is
  /// regenerated with pagination parameters.
  Future<ConsoleUsagePage> loadPage(int page) async {
    if (page > 1) {
      throw UnsupportedError(generatedDartUsagePaginationGapReason);
    }
    return load();
  }

  /// Bounded server page size; additional pages append through "load more".
  static const int pageSize = 20;
}
