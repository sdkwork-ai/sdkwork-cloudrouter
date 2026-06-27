class SdkworkMcpFlutterSdkClients {
  const SdkworkMcpFlutterSdkClients({
    required this.apiBaseUrl,
    required this.backendApiBaseUrl,
    required this.driveAppApiBaseUrl,
    required this.sdkFamilies,
    this.pendingGeneratedSdk = true,
  });

  final String apiBaseUrl;
  final String backendApiBaseUrl;
  final String driveAppApiBaseUrl;
  final List<String> sdkFamilies;
  final bool pendingGeneratedSdk;
}

SdkworkMcpFlutterSdkClients createSdkworkMcpFlutterSdkClients({
  required String apiBaseUrl,
  String? backendApiBaseUrl,
  String? driveAppApiBaseUrl,
}) {
  final normalizedApiBaseUrl = apiBaseUrl.replaceAll(RegExp(r'/+$'), '');
  return SdkworkMcpFlutterSdkClients(
    apiBaseUrl: normalizedApiBaseUrl,
    backendApiBaseUrl: backendApiBaseUrl ??
        '$normalizedApiBaseUrl/backend/v3/api'.replaceAll('/app/v3/api/backend', '/backend'),
    driveAppApiBaseUrl: driveAppApiBaseUrl ?? '$normalizedApiBaseUrl/app/v3/api',
    sdkFamilies: const [
      'sdkwork-mcp-app-sdk',
      'sdkwork-drive-app-sdk',
    ],
    pendingGeneratedSdk: true,
  );
}
