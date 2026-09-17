import 'package:sdkwork_cloudrouter_flutter_mobile_core/sdkwork_cloudrouter_flutter_mobile_core.dart';

import '../models/console_usage_models.dart';

/// Console request and token usage records.
///
/// The console ports are injected by root bootstrap; this service maps records
/// and owns projection only — it never constructs transport.
///
/// Authority: `FLUTTER_APP_MOBILE_ARCHITECTURE_SPEC.md` section 4 (`services/`).
class ConsoleUsageService {
  const ConsoleUsageService({required this.ports});

  final CloudRouterConsolePorts ports;

  Future<ConsoleUsagePage> load() async {
    final payload = await ports.listUsageLogs();
    return projectConsoleUsagePage(payload);
  }
}

ConsoleUsagePage projectConsoleUsagePage(Object? payload) {
  final items = <ConsoleUsageItem>[];
  final records = payload is Map ? payload['records'] : null;
  if (records is List) {
    var index = 0;
    for (final record in records) {
      items.add(
        ConsoleUsageItem(
          id: readConsoleUsageString(record, 'id', index.toString()),
          label: readConsoleUsageString(record, 'name', ''),
          value: readConsoleUsageString(record, 'status', ''),
        ),
      );
      index += 1;
    }
  }
  return ConsoleUsagePage(items: items, hasMore: false);
}
