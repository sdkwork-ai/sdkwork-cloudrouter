import 'package:cloudrouter_app_sdk/cloudrouter_app_sdk.dart';

import 'cloudrouter_app_sdk_clients.dart';

/// Wire-required `CreateApiKeyRequest` values the generated Dart transport
/// cannot express yet; kept here so the gap is explicit and testable.
const String defaultApiKeyQuota = '0.000000';
const String defaultApiKeyIpLimit = 'unrestricted';
const String defaultApiKeyExpiration = 'never';
const List<String> defaultApiKeyModalities = <String>[
  'text',
  'image',
  'video',
  'audio',
  'music',
];

/// Reason surfaced when the generated Dart transport cannot express a wire call.
const String generatedDartTransportGapReason =
    'The generated Dart transport cloudrouter_app_sdk cannot express this wire call yet: '
    'iam.apiKeysCreate() posts without the required CreateApiKeyRequest body. '
    'Regenerate the Dart SDK with request-body support before enabling key creation.';

/// Console ports implemented on the generated Cloud Router app SDK.
///
/// Ports forward the generated payload unchanged; normalization stays in the
/// Dart capability packages so every client root renders the same view models.
class CloudRouterConsolePorts {
  const CloudRouterConsolePorts({required this.clients});

  final CloudRouterAppSdkClients clients;

  SdkworkAppClient get _client => clients.client;

  Future<Object?> retrieveOverview() async {
    return _client.ai.dashboardOverviewRetrieve();
  }

  Future<Object?> listUsageLogs() async {
    return _client.ai.usageLogsList();
  }

  Future<Object?> listApiKeys() async {
    return _client.iam.apiKeysList();
  }

  Future<Object?> listCatalog([int? page, int? pageSize, String? query]) async {
    return _client.ai.modelsList(page, pageSize, query);
  }

  Future<Object?> revokeApiKey(String apiKeyId) async {
    return _client.iam.apiKeysDelete(apiKeyId);
  }

  /// Not callable until the generated Dart transport accepts a request body.
  Future<Object?> createApiKey() async {
    throw UnsupportedError(generatedDartTransportGapReason);
  }
}

CloudRouterConsolePorts createCloudRouterConsolePorts({
  required CloudRouterAppSdkClients sdkClients,
}) {
  return CloudRouterConsolePorts(clients: sdkClients);
}
