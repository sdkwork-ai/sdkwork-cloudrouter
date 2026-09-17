import 'package:sdkwork_cloudrouter_flutter_mobile_core/sdkwork_cloudrouter_flutter_mobile_core.dart';

import '../models/console_api_keys_models.dart';

/// API key listing, creation, and revocation.
///
/// The console ports are injected by root bootstrap; this service maps records
/// and owns projection only — it never constructs transport.
///
/// Authority: `FLUTTER_APP_MOBILE_ARCHITECTURE_SPEC.md` section 4 (`services/`).
class ConsoleApiKeysService {
  const ConsoleApiKeysService({required this.ports});

  final CloudRouterConsolePorts ports;

  Future<ConsoleApiKeysPage> load() async {
    final payload = await ports.listApiKeys();
    return projectConsoleApiKeysPage(payload);
  }
}

ConsoleApiKeysPage projectConsoleApiKeysPage(Object? payload) {
  final items = <ConsoleApiKeysItem>[];
  final records = payload is Map ? payload['records'] : null;
  if (records is List) {
    var index = 0;
    for (final record in records) {
      items.add(
        ConsoleApiKeysItem(
          id: readConsoleApiKeysString(record, 'id', index.toString()),
          label: readConsoleApiKeysString(record, 'name', ''),
          value: readConsoleApiKeysString(record, 'status', ''),
        ),
      );
      index += 1;
    }
  }
  return ConsoleApiKeysPage(items: items, hasMore: false);
}
