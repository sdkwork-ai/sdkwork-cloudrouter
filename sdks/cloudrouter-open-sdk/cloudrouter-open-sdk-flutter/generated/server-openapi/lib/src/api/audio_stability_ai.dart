import '../http/client.dart';
import '../models.dart';



class AudioStabilityAiApi {
  final HttpClient _client;

  AudioStabilityAiApi(this._client);

  /// Stability AI text-to-audio (music and sound effects)
  Future<String?> createTextToAudio(StabilityAudioRequest body) async {
    final payload = body.toJson();
    final response = await _client.post('/stability_ai/v2beta/audio/stable-audio-2/text-to-audio', body: payload, contentType: 'multipart/form-data');
    return response;
  }
}
