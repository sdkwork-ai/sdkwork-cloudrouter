import '../http/client.dart';
import '../models.dart';

import 'response_helpers.dart';


class ImagesZhipuApi {
  final HttpClient _client;

  ImagesZhipuApi(this._client);

  /// Zhipu CogView image generation
  Future<ZhipuImageGenerationResponse?> createApiPaasV4ImagesGeneration(ZhipuImageGenerationRequest body) async {
    final payload = body.toJson();
    final response = await _client.post('/zhipu/api/paas/v4/images/generations', body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ZhipuImageGenerationResponse.fromJson(map);
    })();
  }
}
