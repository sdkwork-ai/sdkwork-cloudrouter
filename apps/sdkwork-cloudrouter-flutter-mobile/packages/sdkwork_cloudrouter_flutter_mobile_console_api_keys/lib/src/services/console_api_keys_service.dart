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

  /// Loads the API key page.
  Future<ConsoleApiKeyPage> load() async {
    return toConsoleApiKeyPage(await ports.listApiKeys());
  }

  /// Creates a key and returns the normalized summary plus the one-time
  /// plaintext secret; throws [UnsupportedError] until the Dart SDK is
  /// regenerated with request-body support (declared transport gap, never raw
  /// HTTP). The name is captured for the future request body — the generated
  /// transport cannot send it yet.
  Future<({ConsoleApiKeySummary key, String? secret})> createKey(String name) async {
    final payload = await ports.createApiKey();
    return (key: toConsoleApiKeySummary(payload), secret: readCreatedApiKeySecret(payload));
  }

  /// Revokes a key by id.
  Future<void> revokeKey(String apiKeyId) async {
    await ports.revokeApiKey(apiKeyId);
  }
}
