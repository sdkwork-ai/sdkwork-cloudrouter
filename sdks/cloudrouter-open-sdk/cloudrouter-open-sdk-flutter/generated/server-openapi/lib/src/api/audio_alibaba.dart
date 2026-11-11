import '../http/client.dart';
import '../models.dart';

import 'response_helpers.dart';


class AudioAlibabaApi {
  final HttpClient _client;

  AudioAlibabaApi(this._client);

  /// Alibaba Qwen TTS speech synthesis
  Future<AlibabaSpeechResponse?> createApiV1ServicesAudioTtsSpeechSynthesizer(AlibabaSpeechRequest body) async {
    final payload = body.toJson();
    final response = await _client.post('/alibaba/api/v1/services/audio/tts/SpeechSynthesizer', body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : AlibabaSpeechResponse.fromJson(map);
    })();
  }
}
