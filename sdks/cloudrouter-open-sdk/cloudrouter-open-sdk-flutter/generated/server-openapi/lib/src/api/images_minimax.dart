import '../http/client.dart';
import '../models.dart';

import 'response_helpers.dart';


class ImagesMinimaxApi {
  final HttpClient _client;

  ImagesMinimaxApi(this._client);

  /// MiniMax image generation
  Future<MinimaxImageGenerationResponse?> createV1ImageGeneration(MinimaxImageGenerationRequest body) async {
    final payload = body.toJson();
    final response = await _client.post('/minimax/v1/image_generation', body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : MinimaxImageGenerationResponse.fromJson(map);
    })();
  }
}
