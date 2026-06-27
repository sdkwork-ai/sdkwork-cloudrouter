import '../http/client.dart';
import '../models.dart';

import 'paths.dart';
import 'response_helpers.dart';


class ModerationsApi {
  final HttpClient _client;

  ModerationsApi(this._client);

  /// Create moderation
  Future<OpenAiModeration?> create(OpenAiModerationCreateRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.aiPath('/moderations'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiModeration.fromJson(map);
    })();
  }
}
