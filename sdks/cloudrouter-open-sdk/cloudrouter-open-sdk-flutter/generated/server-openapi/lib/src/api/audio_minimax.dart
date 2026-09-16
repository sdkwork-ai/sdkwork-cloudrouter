import '../http/client.dart';
import '../models.dart';

import 'response_helpers.dart';


class AudioMinimaxApi {
  final HttpClient _client;

  AudioMinimaxApi(this._client);

  /// Minimax create music generation
  Future<MiniMaxMusicGenerationResponse?> createV1MusicGeneration(MiniMaxMusicGenerationRequest body) async {
    final payload = body.toJson();
    final response = await _client.post('/minimax/v1/music_generation', body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : MiniMaxMusicGenerationResponse.fromJson(map);
    })();
  }
}
