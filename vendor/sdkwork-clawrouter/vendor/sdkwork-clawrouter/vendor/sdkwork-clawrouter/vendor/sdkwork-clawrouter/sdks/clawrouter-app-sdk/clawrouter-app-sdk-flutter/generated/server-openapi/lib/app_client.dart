import 'package:sdkwork_common_flutter/sdkwork_common_flutter.dart';
import 'src/http/client.dart';
import 'src/api/ai.dart';
import 'src/api/chat.dart';
import 'src/api/iam.dart';
import 'src/api/notification.dart';
import 'src/api/runtime.dart';
import 'src/api/system.dart';

class SdkworkAppClient {
  final HttpClient _httpClient;

  late final AiApi ai;
  late final ChatApi chat;
  late final IamApi iam;
  late final NotificationApi notification;
  late final RuntimeApi runtime;
  late final SystemApi system;

  SdkworkAppClient({
    required SdkConfig config,
  }) : _httpClient = HttpClient(config: config) {
    ai = AiApi(_httpClient);
    chat = ChatApi(_httpClient);
    iam = IamApi(_httpClient);
    notification = NotificationApi(_httpClient);
    runtime = RuntimeApi(_httpClient);
    system = SystemApi(_httpClient);
  }

  factory SdkworkAppClient.withBaseUrl({
    required String baseUrl,
    String? authToken,
    String? accessToken,
    Map<String, String>? headers,
    int timeout = 30000,
  }) {
    return SdkworkAppClient(
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
