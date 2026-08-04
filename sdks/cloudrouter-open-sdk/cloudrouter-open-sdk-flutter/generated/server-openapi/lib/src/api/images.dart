import '../http/client.dart';
import '../models.dart';

import 'paths.dart';
import 'response_helpers.dart';


class ImagesApi {
  final HttpClient _client;

  ImagesApi(this._client);

  /// Create image edit
  Future<OpenAiImageList?> createEdit(OpenAiImageEditRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.aiPath('/images/edits'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiImageList.fromJson(map);
    })();
  }

  /// Create image
  Future<OpenAiImageList?> createGeneration(OpenAiImageGenerationRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.aiPath('/images/generations'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiImageList.fromJson(map);
    })();
  }

  /// Create image variation
  Future<OpenAiImageList?> createVariation(OpenAiImageVariationRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.aiPath('/images/variations'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiImageList.fromJson(map);
    })();
  }
}
