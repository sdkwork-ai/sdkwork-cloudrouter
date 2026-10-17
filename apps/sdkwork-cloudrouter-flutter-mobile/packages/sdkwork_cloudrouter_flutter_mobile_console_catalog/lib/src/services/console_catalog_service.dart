import 'package:sdkwork_cloudrouter_flutter_mobile_core/sdkwork_cloudrouter_flutter_mobile_core.dart';

import '../models/console_catalog_models.dart';

/// Official model and pricing catalog.
///
/// The console ports are injected by root bootstrap; this service maps records
/// and owns projection only — it never constructs transport.
///
/// Authority: `FLUTTER_APP_MOBILE_ARCHITECTURE_SPEC.md` section 4 (`services/`).
class ConsoleCatalogService {
  const ConsoleCatalogService({required this.ports});

  final CloudRouterConsolePorts ports;

  /// Loads the first catalog page.
  Future<ConsoleCatalogPage> load() {
    return loadPage(1);
  }

  /// Loads a catalog page through the generated paginated transport.
  Future<ConsoleCatalogPage> loadPage(int page) async {
    final payload = await ports.listCatalog(page, pageSize);
    return toConsoleCatalogPage(payload, page: page, pageSize: pageSize);
  }

  /// Bounded server page size; additional pages append through "load more".
  static const int pageSize = 20;
}
