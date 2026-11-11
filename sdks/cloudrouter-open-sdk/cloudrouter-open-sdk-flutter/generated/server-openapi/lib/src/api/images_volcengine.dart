import '../http/client.dart';
import '../models.dart';

import 'response_helpers.dart';


class ImagesVolcengineApi {
  final HttpClient _client;

  ImagesVolcengineApi(this._client);

  /// Volcengine Ark image generation
  Future<VolcengineImageGenerationResponse?> createApiV3ImagesGeneration(VolcengineImageGenerationRequest body) async {
    final payload = body.toJson();
    final response = await _client.post('/volcengine/api/v3/images/generations', body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : VolcengineImageGenerationResponse.fromJson(map);
    })();
  }
}
