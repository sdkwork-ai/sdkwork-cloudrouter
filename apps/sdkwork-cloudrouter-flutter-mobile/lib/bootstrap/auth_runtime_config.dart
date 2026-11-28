import 'package:sdkwork_cloudrouter_flutter_mobile_core/sdkwork_cloudrouter_flutter_mobile_core.dart';
import 'package:sdkwork_iam_flutter_mobile_auth/sdkwork_iam_flutter_mobile_auth.dart';

/// Password-only policy used when the host has not adopted the auth-runtime
/// endpoint, so a transient failure never blanks the sign-in screen.
const IamFlutterMobileAuthRuntimeConfig cloudRouterFallbackAuthRuntimeConfig =
    IamFlutterMobileAuthRuntimeConfig();

/// Reads the anonymous auth policy the console configured for this host.
Future<IamFlutterMobileAuthRuntimeConfig> fetchCloudRouterAuthRuntimeConfig(
  CloudRouterAppSdkClients clients,
) async {
  try {
    final result = await clients.client.iam.authRuntimeRetrieve();
    final Object? data = result?.data;
    if (data is! Map) {
      return cloudRouterFallbackAuthRuntimeConfig;
    }
    return cloudRouterAuthRuntimeConfigFromJson(
      Map<String, dynamic>.from(data),
    );
  } catch (_) {
    // The sign-in screen must stay reachable when the policy fetch fails.
    return cloudRouterFallbackAuthRuntimeConfig;
  }
}

/// Maps the `AppAuthRuntimeSettingsResponse` payload onto the shared
/// `IamFlutterMobileAuthRuntimeConfig` policy model.
IamFlutterMobileAuthRuntimeConfig cloudRouterAuthRuntimeConfigFromJson(
  Map<String, dynamic> json,
) {
  final Object? verification = json['verificationPolicy'];
  return IamFlutterMobileAuthRuntimeConfig(
    loginMethods: _stringList(json['loginMethods']),
    registerMethods: _stringList(json['registerMethods']),
    recoveryMethods: _stringList(json['recoveryMethods']),
    oauthLoginEnabled:
        json['oauthLoginEnabled'] is bool ? json['oauthLoginEnabled'] as bool : null,
    verificationPolicy: verification is Map
        ? _verificationPolicy(Map<String, dynamic>.from(verification))
        : null,
  );
}

IamFlutterMobileAuthVerificationPolicy _verificationPolicy(
  Map<String, dynamic> json,
) {
  bool? read(String key) => json[key] is bool ? json[key] as bool : null;
  return IamFlutterMobileAuthVerificationPolicy(
    emailCodeLoginEnabled: read('emailCodeLoginEnabled'),
    emailRegistrationVerificationRequired:
        read('emailRegistrationVerificationRequired'),
    phoneCodeLoginEnabled: read('phoneCodeLoginEnabled'),
    phoneRegistrationVerificationRequired:
        read('phoneRegistrationVerificationRequired'),
  );
}

List<String>? _stringList(Object? value) {
  if (value is! List) return null;
  return value
      .map((item) => item?.toString())
      .whereType<String>()
      .toList(growable: false);
}
