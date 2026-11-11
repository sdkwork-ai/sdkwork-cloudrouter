import '../http/client.dart';
import '../models.dart';

import 'response_helpers.dart';


class ImagesBytedanceApi {
  final HttpClient _client;

  ImagesBytedanceApi(this._client);

  /// ByteDance Seedream image generation
  Future<BytedanceImageGenerationResponse?> createApiV3ImagesGeneration(BytedanceImageGenerationRequest body) async {
    final payload = body.toJson();
    final response = await _client.post('/bytedance/api/v3/images/generations', body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : BytedanceImageGenerationResponse.fromJson(map);
    })();
  }
}
