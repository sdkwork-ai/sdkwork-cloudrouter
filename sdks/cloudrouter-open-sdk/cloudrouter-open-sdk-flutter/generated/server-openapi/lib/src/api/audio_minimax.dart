import '../http/client.dart';
import '../models.dart';

import 'response_helpers.dart';


class AudioMinimaxApi {
  final HttpClient _client;

  AudioMinimaxApi(this._client);

  /// MiniMax speech synthesis
  Future<MinimaxTextToSpeechResponse?> createV1T2aV(MinimaxTextToSpeechRequest body) async {
    final payload = body.toJson();
    final response = await _client.post('/minimax/v1/t2a_v2', body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : MinimaxTextToSpeechResponse.fromJson(map);
    })();
  }
}
