import 'package:sdkwork_cloudrouter_flutter_mobile_core/sdkwork_cloudrouter_flutter_mobile_core.dart';
import 'package:sdkwork_iam_flutter_mobile_auth/sdkwork_iam_flutter_mobile_auth.dart';

/// IAM data source backed by the CloudRouter generated app SDK session call.
///
/// The shared IAM auth screen owns presentation and validation; this host
/// supplies the transport through [requestCloudRouterConsoleSession] and writes
/// the returned tokens back to the CloudRouter SDK client.
class CloudRouterIamAuthDataSource implements IamFlutterMobileAuthDataSource {
  CloudRouterIamAuthDataSource(this.clients);

  final CloudRouterAppSdkClients clients;

  IamFlutterMobileAuthSession? _session;

  @override
  IamFlutterMobileAuthSession? get currentSession => _session;

  @override
  Future<IamFlutterMobileAuthSession> signInWithPassword({
    required String password,
    required String username,
  }) async {
    final session = await requestCloudRouterConsoleSession(
      clients: clients,
      account: username,
      password: password,
    );
    final result = IamFlutterMobileAuthSession(
      accessToken: session.accessToken,
      authToken: session.authToken,
      userId: session.subject,
    );
    _session = result;
    return result;
  }

  @override
  Future<void> signOut() async {
    clients.client.setAccessToken('');
    clients.client.setAuthToken('');
    _session = null;
  }

  @override
  Future<void> requestPasswordResetCode(String account) async {
    throw UnsupportedError(
      'CloudRouter Flutter sign-in does not expose password reset yet.',
    );
  }

  @override
  Future<void> resetPassword(IamFlutterMobileAuthResetDraft draft) async {
    throw UnsupportedError(
      'CloudRouter Flutter sign-in does not expose password reset yet.',
    );
  }
}
