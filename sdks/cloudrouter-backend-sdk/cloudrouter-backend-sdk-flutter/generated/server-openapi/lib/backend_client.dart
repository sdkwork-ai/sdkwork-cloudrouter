import 'package:sdkwork_common_flutter/sdkwork_common_flutter.dart';
import 'src/http/client.dart';
import 'src/api/ai.dart';
import 'src/api/integration.dart';
import 'src/api/sites.dart';
import 'src/api/system.dart';

class SdkworkBackendClient {
  final HttpClient _httpClient;

  late final AiApi ai;
  late final IntegrationApi integration;
  late final SitesApi sites;
  late final SystemApi system;

  SdkworkBackendClient({
    required SdkConfig config,
  }) : _httpClient = HttpClient(config: config) {
    ai = AiApi(_httpClient);
    integration = IntegrationApi(_httpClient);
    sites = SitesApi(_httpClient);
    system = SystemApi(_httpClient);
  }

  factory SdkworkBackendClient.withBaseUrl({
    required String baseUrl,
    String? authToken,
    String? accessToken,
    Map<String, String>? headers,
    int timeout = 30000,
  }) {
    return SdkworkBackendClient(
      config: SdkConfig(
        baseUrl: baseUrl,
        timeout: timeout,
        headers: headers ?? const {},
        authToken: authToken,
        accessToken: accessToken,
      ),
    );
  }

  void setAuthToken(String token) {
    _httpClient.setAuthToken(token);
  }

  void setAccessToken(String token) {
    _httpClient.setAccessToken(token);
  }

  void setHeader(String key, String value) {
    _httpClient.setHeader(key, value);
  }
}
