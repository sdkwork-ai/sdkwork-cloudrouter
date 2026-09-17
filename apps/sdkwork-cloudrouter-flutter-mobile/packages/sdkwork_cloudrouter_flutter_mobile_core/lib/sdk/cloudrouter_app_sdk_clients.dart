import 'package:cloudrouter_app_sdk/cloudrouter_app_sdk.dart';

const String cloudRouterAppApiPrefix = '/app/v3/api';

/// Generated Dart app SDK clients held by the root runtime.
class CloudRouterAppSdkClients {
  const CloudRouterAppSdkClients({
    required this.appApiBaseUrl,
    required this.client,
  });

  final String appApiBaseUrl;
  final SdkworkAppClient client;
}

CloudRouterAppSdkClients createCloudRouterAppSdkClients({
  required String appApiBaseUrl,
  String? authToken,
  String? accessToken,
}) {
  final normalized = normalizeCloudRouterAppApiBaseUrl(appApiBaseUrl);
  return CloudRouterAppSdkClients(
    appApiBaseUrl: normalized,
    client: SdkworkAppClient.withBaseUrl(
      baseUrl: resolveCloudRouterTransportBaseUrl(normalized),
      authToken: authToken,
      accessToken: accessToken,
    ),
  );
}

/// Validates that the configured value is an absolute HTTP(S) URL carrying the
/// app API prefix exactly once.
String normalizeCloudRouterAppApiBaseUrl(String value) {
  final normalized = value.trim().replaceFirst(RegExp(r'/+'), '');
  final uri = Uri.tryParse(normalized);
  if (uri == null ||
      !uri.hasScheme ||
      (uri.scheme != 'http' && uri.scheme != 'https') ||
      uri.host.isEmpty ||
      uri.hasQuery ||
      uri.hasFragment ||
      !uri.path.endsWith(cloudRouterAppApiPrefix)) {
    throw ArgumentError.value(
      value,
      'appApiBaseUrl',
      'must be an absolute HTTP(S) URL ending with ' + cloudRouterAppApiPrefix,
    );
  }
  final withoutSuffix =
      uri.path.substring(0, uri.path.length - cloudRouterAppApiPrefix.length);
  if (withoutSuffix.endsWith(cloudRouterAppApiPrefix)) {
    throw ArgumentError.value(
      value,
      'appApiBaseUrl',
      'must contain ' + cloudRouterAppApiPrefix + ' exactly once',
    );
  }
  return normalized;
}

/// Strips the app API prefix because the generated Dart client appends it.
String resolveCloudRouterTransportBaseUrl(String appApiBaseUrl) {
  final normalized = normalizeCloudRouterAppApiBaseUrl(appApiBaseUrl);
  final uri = Uri.parse(normalized);
  final transportPath =
      uri.path.substring(0, uri.path.length - cloudRouterAppApiPrefix.length);
  return uri
      .replace(path: transportPath)
      .toString()
      .replaceFirst(RegExp(r'/+'), '');
}
