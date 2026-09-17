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

  Future<ConsoleCatalogPage> load() async {
    final payload = await ports.listCatalog();
    return projectConsoleCatalogPage(payload);
  }
}

ConsoleCatalogPage projectConsoleCatalogPage(Object? payload) {
  final items = <ConsoleCatalogItem>[];
  final records = payload is Map ? payload['records'] : null;
  if (records is List) {
    var index = 0;
    for (final record in records) {
      items.add(
        ConsoleCatalogItem(
          id: readConsoleCatalogString(record, 'id', index.toString()),
          label: readConsoleCatalogString(record, 'name', ''),
          value: readConsoleCatalogString(record, 'status', ''),
        ),
      );
      index += 1;
    }
  }
  return ConsoleCatalogPage(items: items, hasMore: false);
}
