import 'package:sdkwork_agents_app_sdk/sdkwork_agents_app_sdk.dart';

/// Creates the Agents app SDK client for the signed-in CloudRouter session.
///
/// The generated client appends `/app/v3/api` itself, so [gatewayBaseUrl] is the
/// gateway origin (no API prefix).
SdkworkAppClient createCloudRouterPlaygroundClient({
  required String gatewayBaseUrl,
  String? accessToken,
  String? authToken,
}) {
  return SdkworkAppClient.withBaseUrl(
    baseUrl: gatewayBaseUrl,
    accessToken: accessToken,
    authToken: authToken,
  );
}
