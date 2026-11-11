import '../http/client.dart';
import '../models.dart';

import 'response_helpers.dart';


class VideosBlackForestLabsApi {
  final HttpClient _client;

  VideosBlackForestLabsApi(this._client);

  /// Black Forest Labs FLUX 3 video generation
  Future<BlackForestLabsVideoGenerationTask?> createFlux3Video(BlackForestLabsVideoGenerationRequest body) async {
    final payload = body.toJson();
    final response = await _client.post('/black_forest_labs/v1/flux-3-video', body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : BlackForestLabsVideoGenerationTask.fromJson(map);
    })();
  }
}
