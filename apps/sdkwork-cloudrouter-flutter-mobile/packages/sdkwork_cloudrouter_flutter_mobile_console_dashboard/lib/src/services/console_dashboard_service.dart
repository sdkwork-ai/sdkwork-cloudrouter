import 'package:sdkwork_cloudrouter_flutter_mobile_core/sdkwork_cloudrouter_flutter_mobile_core.dart';

import '../models/console_dashboard_models.dart';

/// Console overview and gateway health.
///
/// The console ports are injected by root bootstrap; this service maps records
/// and owns projection only — it never constructs transport.
///
/// Authority: `FLUTTER_APP_MOBILE_ARCHITECTURE_SPEC.md` section 4 (`services/`).
class ConsoleDashboardService {
  const ConsoleDashboardService({required this.ports});

  final CloudRouterConsolePorts ports;

  Future<ConsoleDashboardPage> load() async {
    final payload = await ports.retrieveOverview();
    return projectConsoleDashboardPage(payload);
  }
}

ConsoleDashboardPage projectConsoleDashboardPage(Object? payload) {
  final items = <ConsoleDashboardItem>[];
  final records = payload is Map ? payload['records'] : null;
  if (records is List) {
    var index = 0;
    for (final record in records) {
      items.add(
        ConsoleDashboardItem(
          id: readConsoleDashboardString(record, 'id', index.toString()),
          label: readConsoleDashboardString(record, 'name', ''),
          value: readConsoleDashboardString(record, 'status', ''),
        ),
      );
      index += 1;
    }
  }
  return ConsoleDashboardPage(items: items, hasMore: false);
}
