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

  Future<ConsoleDashboardSnapshot> load() async {
    return projectConsoleDashboardSnapshot(await ports.retrieveOverview());
  }
}
