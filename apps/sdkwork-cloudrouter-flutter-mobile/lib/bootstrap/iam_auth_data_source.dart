import 'package:sdkwork_cloudrouter_flutter_mobile_core/sdkwork_cloudrouter_flutter_mobile_core.dart';
import 'package:sdkwork_iam_app_sdk/sdkwork_iam_app_sdk.dart' as iam_sdk;
import 'package:sdkwork_iam_flutter_mobile_auth/sdkwork_iam_flutter_mobile_auth.dart';

/// IAM data source backed by the generated IAM app SDK.
///
/// The shared IAM auth screens own presentation and validation; this host
/// supplies the transport through the typed generated client and writes the
/// returned tokens back to the CloudRouter SDK client.
class CloudRouterIamAuthDataSource
    implements
        IamFlutterMobileAuthDataSource,
        IamFlutterMobileAuthExtendedDataSource {
  CloudRouterIamAuthDataSource(this.clients)
      : iamClient = createCloudRouterIamClient(clients);

  final CloudRouterAppSdkClients clients;
  final iam_sdk.SdkworkAppClient iamClient;

  IamFlutterMobileAuthSession? _session;

  @override
  IamFlutterMobileAuthSession? get currentSession => _session;

  @override
  Future<IamFlutterMobileLoginResult> signInWithPassword({
    required String password,
    required String username,
  }) async {
    return _loginResult(await requestCloudRouterPasswordSession(
      clients: clients,
      iamClient: iamClient,
      account: username,
      password: password,
    ));
  }

  @override
  Future<IamFlutterMobileLoginResult> signInWithCode({
    required String account,
    required String code,
  }) async {
    return _loginResult(await requestCloudRouterCodeSession(
      clients: clients,
      iamClient: iamClient,
      account: account,
      code: code,
    ));
  }

  @override
  Future<IamFlutterMobileLoginResult> register(
      IamFlutterMobileRegisterDraft draft) async {
    return _loginResult(await requestCloudRouterRegistration(
      clients: clients,
      iamClient: iamClient,
      account: draft.account.trim(),
      password: draft.password,
      confirmPassword: draft.confirmPassword,
      channel: switch (draft.channel) {
        'email' => 'EMAIL',
        'phone' => 'PHONE',
        _ => null,
      },
      code: draft.code,
    ));
  }

  @override
  Future<void> requestVerificationCode({
    required String account,
    required IamFlutterMobileVerificationScene scene,
  }) {
    return requestCloudRouterVerificationCode(
      iamClient: iamClient,
      account: account,
      scene: scene.wireName,
    );
  }

  @override
  Future<IamFlutterMobileAuthSession> selectLoginContext(
      Map<String, String> body) async {
    final Map<String, dynamic> data = await requestCloudRouterLoginContext(
      clients: clients,
      iamClient: iamClient,
      body: body,
    );
    // A second challenge is not a final session and must fail closed.
    if (parseIamLoginContextSelectionChallenge(data) != null) {
      throw StateError(
          'Login-context selection returned another challenge instead of a session.');
    }
    final IamFlutterMobileAuthSession session =
        parseIamFlutterMobileAuthSession(data);
    _session = session;
    return session;
  }

  @override
  Future<void> signOut() async {
    try {
      await requestCloudRouterSignOut(iamClient: iamClient);
    } catch (_) {
      // Local credentials are cleared even when server-side sign-out fails.
    }
    clients.client.setAccessToken('');
    clients.client.setAuthToken('');
    _session = null;
  }

  @override
  Future<void> requestPasswordResetCode(String account) {
    return requestCloudRouterPasswordResetCode(
      iamClient: iamClient,
      account: account,
    );
  }

  @override
  Future<void> resetPassword(IamFlutterMobileAuthResetDraft draft) {
    return requestCloudRouterPasswordReset(
      iamClient: iamClient,
      account: draft.account.trim(),
      code: draft.code.trim(),
      confirmPassword: draft.confirmPassword,
      newPassword: draft.newPassword,
    );
  }

  IamFlutterMobileLoginResult _loginResult(Map<String, dynamic> data) {
    final IamLoginContextSelectionChallenge? challenge =
        parseIamLoginContextSelectionChallenge(data);
    if (challenge != null) {
      return IamFlutterMobileLoginContextSelectionRequiredResult(challenge);
    }
    final IamFlutterMobileAuthSession session =
        parseIamFlutterMobileAuthSession(data);
    _session = session;
    return IamFlutterMobileLoginSessionResult(session);
  }
}
