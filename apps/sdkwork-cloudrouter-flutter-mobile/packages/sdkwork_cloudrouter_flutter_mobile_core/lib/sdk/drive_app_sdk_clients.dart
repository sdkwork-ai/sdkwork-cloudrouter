import 'package:sdkwork_drive_app_sdk_generated_flutter/sdkwork_drive_app_sdk_generated_flutter.dart'
    as drive_sdk;

import 'cloudrouter_app_sdk_clients.dart';

/// Drive App SDK entry owned by the Flutter core.
///
/// Community media references are `drive://spaces/.../nodes/<nodeId>`; this
/// wrapper resolves them to a short-lived download URL without leaking the
/// generated drive package into feature code.
class CloudRouterDriveAppSdkClient {
  const CloudRouterDriveAppSdkClient({required this.client});

  final drive_sdk.SdkworkAppClient client;

  Future<String?> resolveDownloadUrl(String nodeId) async {
    final response = await client.drive.downloadGrantsCreate(nodeId);
    final data = response?.data;
    if (data is! Map) return null;
    final direct = data['downloadUrl'] ?? data['url'];
    if (direct is String && direct.startsWith('http')) return direct;
    final nested = data['item'];
    if (nested is Map) {
      final url = nested['downloadUrl'] ?? nested['url'];
      if (url is String && url.startsWith('http')) return url;
    }
    return null;
  }
}

CloudRouterDriveAppSdkClient createCloudRouterDriveAppSdkClient({
  required String appApiBaseUrl,
  String? accessToken,
  String? authToken,
}) {
  return CloudRouterDriveAppSdkClient(
    client: drive_sdk.SdkworkAppClient.withBaseUrl(
      baseUrl: resolveCloudRouterTransportBaseUrl(appApiBaseUrl),
      accessToken: accessToken,
      authToken: authToken,
    ),
  );
}
