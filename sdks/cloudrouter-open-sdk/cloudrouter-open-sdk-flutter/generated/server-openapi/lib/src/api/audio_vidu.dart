import '../http/client.dart';
import '../models.dart';

import 'response_helpers.dart';


class AudioViduApi {
  final HttpClient _client;

  AudioViduApi(this._client);

  /// Vidu text to audio
  Future<ViduAudioGenerationTask?> createEntV2Text2audio(ViduTextToAudioRequest body) async {
    final payload = body.toJson();
    final response = await _client.post('/vidu/ent/v2/text2audio', body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ViduAudioGenerationTask.fromJson(map);
    })();
  }

  /// Vidu timing to audio
  Future<ViduAudioGenerationTask?> createEntV2Timing2audio(ViduTimingToAudioRequest body) async {
    final payload = body.toJson();
    final response = await _client.post('/vidu/ent/v2/timing2audio', body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ViduAudioGenerationTask.fromJson(map);
    })();
  }
}
