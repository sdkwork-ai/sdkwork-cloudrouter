import 'package:sdkwork_community_app_sdk_generated_flutter/sdkwork_community_app_sdk_generated_flutter.dart';

import 'cloudrouter_app_sdk_clients.dart';

export 'package:sdkwork_community_app_sdk_generated_flutter/sdkwork_community_app_sdk_generated_flutter.dart';

/// Community App SDK entry owned by the Flutter core.
///
/// Feature packages consume this export instead of importing the generated
/// package directly, keeping the generated transport behind one composition
/// boundary (`APP_SDK_INTEGRATION_SPEC.md` section 4).
class CloudRouterCommunityAppSdkClient {
  const CloudRouterCommunityAppSdkClient({required this.client});

  final SdkworkAppClient client;
}

CloudRouterCommunityAppSdkClient createCloudRouterCommunityAppSdkClient({
  required String appApiBaseUrl,
  String? accessToken,
  String? authToken,
}) {
  return CloudRouterCommunityAppSdkClient(
    client: SdkworkAppClient.withBaseUrl(
      baseUrl: resolveCloudRouterTransportBaseUrl(appApiBaseUrl),
      accessToken: accessToken,
      authToken: authToken,
    ),
  );
}
