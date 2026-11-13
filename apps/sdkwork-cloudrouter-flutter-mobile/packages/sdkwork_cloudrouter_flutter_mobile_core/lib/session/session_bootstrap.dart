import 'package:sdkwork_iam_app_sdk/sdkwork_iam_app_sdk.dart' as iam_sdk;

import '../sdk/cloudrouter_app_sdk_clients.dart';

import 'console_session.dart';

/// Creates a console session through the generated IAM app SDK.
///
/// The browser roots sign in through `POST /auth/sessions` on the IAM app SDK;
/// this root uses the generated Dart counterpart instead of raw HTTP or copied
/// TypeScript wrapper logic. Tokens are written back to the CloudRouter app SDK
/// client so the console ports call the API with the new identity immediately.
Future<CloudRouterSession> requestCloudRouterConsoleSession({
  required CloudRouterAppSdkClients clients,
  required String account,
  required String password,
}) async {
  final iamClient = iam_sdk.SdkworkAppClient.withBaseUrl(
    baseUrl: resolveCloudRouterTransportBaseUrl(clients.appApiBaseUrl),
  );
  final response = await iamClient.auth.sessionsCreate(
    iam_sdk.AppbaseSessionCreateCommand(
      username: account,
      password: password,
    ),
  );
  final data = response?.data;
  if (data is! Map) {
    throw StateError('IAM sign-in returned no session payload.');
  }
  final accessToken = data['accessToken']?.toString();
  final authToken = data['authToken']?.toString();
  final hasAccess = accessToken != null && accessToken.isNotEmpty;
  final hasAuth = authToken != null && authToken.isNotEmpty;
  if (!hasAccess && !hasAuth) {
    throw StateError('IAM sign-in returned no token.');
  }
  if (hasAccess) {
    clients.client.setAccessToken(accessToken);
  }
  if (hasAuth) {
    clients.client.setAuthToken(authToken);
  }
  final user = data['user'];
  final subject = user is Map
      ? (user['id'] ?? user['userId'])?.toString()
      : data['userId']?.toString();
  return readCloudRouterSession(
    accessToken: accessToken,
    authToken: authToken,
    subject: subject,
  );
}
