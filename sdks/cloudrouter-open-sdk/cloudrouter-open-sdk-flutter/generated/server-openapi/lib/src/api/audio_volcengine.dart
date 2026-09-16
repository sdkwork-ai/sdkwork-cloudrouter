import '../http/client.dart';
import '../models.dart';

import 'paths.dart';


class AudioVolcengineApi {
  final HttpClient _client;

  AudioVolcengineApi(this._client);

  /// Volcengine create speech
  Future<String?> createApiV3AudioSpeech(OpenAiSpeechCreateRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.aiPath('/volcengine/api/v3/audio/speech'), body: payload, contentType: 'application/json');
    return response;
  }
}
