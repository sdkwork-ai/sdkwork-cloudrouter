import 'package:sdkwork_iam_app_sdk/sdkwork_iam_app_sdk.dart' as iam_sdk;

import '../sdk/cloudrouter_app_sdk_clients.dart';

/// Creates the generated IAM app client bound to the CloudRouter app origin.
///
/// The browser roots sign in through `POST /auth/sessions` on the IAM app SDK;
/// this root uses the generated Dart counterpart instead of raw HTTP or copied
/// TypeScript wrapper logic.
iam_sdk.SdkworkAppClient createCloudRouterIamClient(
  CloudRouterAppSdkClients clients,
) {
  return iam_sdk.SdkworkAppClient.withBaseUrl(
    baseUrl: resolveCloudRouterTransportBaseUrl(clients.appApiBaseUrl),
  );
}

/// Signs in with a password and unwraps the session payload.
Future<Map<String, dynamic>> requestCloudRouterPasswordSession({
  required CloudRouterAppSdkClients clients,
  required iam_sdk.SdkworkAppClient iamClient,
  required String account,
  required String password,
}) {
  return _createSession(
    clients: clients,
    iamClient: iamClient,
    command: iam_sdk.AppbaseSessionCreateCommand(
      username: account,
      password: password,
    ),
  );
}

/// Signs in with an email or phone verification code.
Future<Map<String, dynamic>> requestCloudRouterCodeSession({
  required CloudRouterAppSdkClients clients,
  required iam_sdk.SdkworkAppClient iamClient,
  required String account,
  required String code,
}) {
  final bool phone = !account.contains('@');
  return _createSession(
    clients: clients,
    iamClient: iamClient,
    command: iam_sdk.AppbaseSessionCreateCommand(
      code: code,
      grantType: phone ? 'phone_code' : 'email_code',
      email: phone ? null : account,
      phone: phone ? account : null,
    ),
  );
}

/// Registers an account and unwraps the resulting session payload.
Future<Map<String, dynamic>> requestCloudRouterRegistration({
  required CloudRouterAppSdkClients clients,
  required iam_sdk.SdkworkAppClient iamClient,
  required String account,
  required String password,
  required String confirmPassword,
  String? channel,
  String? code,
}) async {
  final String? verificationCode = _optional(code);
  final String? registrationChannel = _optional(channel);
  final response = await iamClient.auth.registrationsCreate(<String, dynamic>{
    ...(registrationChannel != null && verificationCode != null
        ? {
            'channel': registrationChannel.toUpperCase(),
            'verificationCode': verificationCode,
          }
        : <String, dynamic>{}),
    'confirmPassword': confirmPassword,
    'password': password,
    'username': account,
  });
  return _commitSessionPayload(clients, _responseData(response));
}

/// Asks IAM to send a verification code for [account].
Future<void> requestCloudRouterVerificationCode({
  required iam_sdk.SdkworkAppClient iamClient,
  required String account,
  required String scene,
}) async {
  await iamClient.auth.verificationCodeRequestsCreate(<String, dynamic>{
    'account': account,
    'scene': scene,
  });
}

/// Asks IAM to send a password-reset code for [account].
Future<void> requestCloudRouterPasswordResetCode({
  required iam_sdk.SdkworkAppClient iamClient,
  required String account,
}) async {
  await iamClient.auth.passwordResetRequestsCreate(<String, dynamic>{
    'account': account,
  });
}

/// Exchanges a received code for a new password.
Future<void> requestCloudRouterPasswordReset({
  required iam_sdk.SdkworkAppClient iamClient,
  required String account,
  required String code,
  required String confirmPassword,
  required String newPassword,
}) async {
  await iamClient.auth.passwordResetsCreate(<String, dynamic>{
    'account': account,
    'code': code,
    'confirmPassword': confirmPassword,
    'newPassword': newPassword,
  });
}

/// Continues a login-context challenge with an explicit personal/organization choice.
Future<Map<String, dynamic>> requestCloudRouterLoginContext({
  required CloudRouterAppSdkClients clients,
  required iam_sdk.SdkworkAppClient iamClient,
  required Map<String, String> body,
}) async {
  final response = body['loginScope'] == 'ORGANIZATION'
      ? await iamClient.auth.sessionsOrganizationSelectionCreate(body)
      : await iamClient.auth.sessionsLoginContextSelectionCreate(body);
  return _commitSessionPayload(clients, _responseData(response));
}

/// Revokes the server-side session; local tokens are cleared by the caller.
Future<void> requestCloudRouterSignOut({
  required iam_sdk.SdkworkAppClient iamClient,
}) async {
  await iamClient.auth.sessionsCurrentDelete();
}

Future<Map<String, dynamic>> _createSession({
  required CloudRouterAppSdkClients clients,
  required iam_sdk.SdkworkAppClient iamClient,
  required iam_sdk.AppbaseSessionCreateCommand command,
}) async {
  final response = await iamClient.auth.sessionsCreate(command);
  return _commitSessionPayload(clients, _responseData(response));
}

/// Writes the returned tokens back to the CloudRouter app SDK client.
///
/// A context challenge carries a continuation token instead of credentials, so
/// it is returned unchanged: no token is committed until a real session exists.
Map<String, dynamic> _commitSessionPayload(
  CloudRouterAppSdkClients clients,
  Map<String, dynamic> data,
) {
  final String? accessToken = _optional(data['accessToken']);
  final String? authToken = _optional(data['authToken']);
  if (accessToken == null && authToken == null) {
    return data;
  }
  if (accessToken != null) {
    clients.client.setAccessToken(accessToken);
  }
  if (authToken != null) {
    clients.client.setAuthToken(authToken);
  }
  return data;
}

Map<String, dynamic> _responseData(iam_sdk.SdkWorkResourceResponse? response) {
  final Object? data = response?.data;
  if (data is Map) {
    return Map<String, dynamic>.from(data);
  }
  throw StateError('IAM sign-in returned no session payload.');
}

String? _optional(Object? value) {
  final String? normalized = value?.toString().trim();
  return normalized == null || normalized.isEmpty ? null : normalized;
}
