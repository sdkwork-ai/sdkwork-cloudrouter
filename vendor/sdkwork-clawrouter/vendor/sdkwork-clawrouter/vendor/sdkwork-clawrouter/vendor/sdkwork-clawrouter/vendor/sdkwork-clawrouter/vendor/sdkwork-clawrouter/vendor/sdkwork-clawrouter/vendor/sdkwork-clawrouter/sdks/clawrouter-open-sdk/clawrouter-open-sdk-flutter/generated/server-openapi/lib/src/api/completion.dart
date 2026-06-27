import '../http/client.dart';
import '../models.dart';

import 'paths.dart';
import 'response_helpers.dart';


class CompletionApi {
  final HttpClient _client;

  CompletionApi(this._client);

  /// Create completion
  Future<OpenAiCompletion?> create(OpenAiCompletionCreateRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.aiPath('/completions'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiCompletion.fromJson(map);
    })();
  }
}
