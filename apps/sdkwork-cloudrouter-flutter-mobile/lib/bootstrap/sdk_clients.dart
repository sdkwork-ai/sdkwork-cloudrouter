import 'package:sdkwork_cloudrouter_flutter_mobile_core/sdkwork_cloudrouter_flutter_mobile_core.dart';

typedef SdkClients = CloudRouterAppSdkClients;

/// Materialized by `pnpm workflow:materialize-client-env` and injected through
/// `--dart-define`. The default keeps a bare `flutter run` usable against the
/// collapsed standalone topology (`etc/topology/standalone.development.env`).
const String _configuredAppApiBaseUrl = String.fromEnvironment(
  'SDKWORK_CLOUDROUTER_ROUTER_APP_API_BASE_URL',
  defaultValue: 'http://127.0.0.1:3905' + '/app/v3/api',
);

const String sdkworkEnvironment = String.fromEnvironment(
  'SDKWORK_ENVIRONMENT',
  defaultValue: 'development',
);

const String sdkworkDeploymentProfile = String.fromEnvironment(
  'SDKWORK_DEPLOYMENT_PROFILE',
  defaultValue: 'standalone',
);

const String sdkworkProfileId = String.fromEnvironment(
  'SDKWORK_PROFILE_ID',
  defaultValue: 'standalone.development',
);

const String sdkworkRuntimeTarget = String.fromEnvironment(
  'SDKWORK_RUNTIME_TARGET',
  defaultValue: 'flutter-android',
);

SdkClients createSdkClients({
  String? appApiBaseUrl,
  String? authToken,
  String? accessToken,
}) {
  return createCloudRouterAppSdkClients(
    appApiBaseUrl: appApiBaseUrl ?? _configuredAppApiBaseUrl,
    authToken: authToken,
    accessToken: accessToken,
  );
}
