import '../http/client.dart';
import '../models.dart';

import 'response_helpers.dart';


class ImagesViduApi {
  final HttpClient _client;

  ImagesViduApi(this._client);

  /// Vidu reference to image
  Future<ViduImageGenerationTask?> createEntV2Reference2image(ViduReferenceToImageRequest body) async {
    final payload = body.toJson();
    final response = await _client.post('/vidu/ent/v2/reference2image', body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ViduImageGenerationTask.fromJson(map);
    })();
  }
}
