import '../sdk/cloudrouter_app_sdk_clients.dart';

import 'console_session.dart';

/// Reason surfaced when the generated Dart transport cannot express the session
/// bootstrap call.
///
/// The browser roots sign in through the generated app SDK HTTP client
/// (`client.http.request('/auth/sessions', ...)`); the generated Dart client
/// keeps its HTTP surface private and exposes only token setters, so the same
/// wire call cannot be expressed yet. Per `APP_FLUTTER_UI_SPEC.md` section 4 the
/// gap MUST be fixed by regenerating the Dart SDK with the session endpoint
/// instead of filling it with raw `http` calls, manual headers, or copied
/// TypeScript wrapper logic. The sign-in screen shows this reason verbatim.
const String generatedDartSessionBootstrapGapReason =
    'The generated Dart transport cloudrouter_app_sdk cannot express the session '
    'bootstrap call yet: SdkworkAppClient exposes token setters but no request '
    'surface for POST /auth/sessions. Regenerate the Dart SDK with the session '
    'endpoint before enabling sign-in.';

/// Creates a console session from account credentials.
///
/// Always throws [UnsupportedError] carrying
/// [generatedDartSessionBootstrapGapReason] until the Dart SDK is regenerated;
/// callers surface the reason instead of failing silently.
Future<CloudRouterSession> requestCloudRouterConsoleSession({
  required CloudRouterAppSdkClients clients,
  required String account,
  required String password,
}) async {
  throw UnsupportedError(generatedDartSessionBootstrapGapReason);
}
