import '../http/client.dart';
import '../models.dart';

import 'paths.dart';
import 'response_helpers.dart';


class ToolApi {
  final HttpClient _client;

  ToolApi(this._client);

  /// Fetch a web page
  Future<OpenAiDeepSeekWebFetchResponse?> createFetch(OpenAiDeepSeekWebFetchRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.aiPath('/tools/fetch'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiDeepSeekWebFetchResponse.fromJson(map);
    })();
  }

  /// Search the web
  Future<OpenAiDeepSeekWebSearchResponse?> search(OpenAiDeepSeekWebSearchRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.aiPath('/tools/search'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiDeepSeekWebSearchResponse.fromJson(map);
    })();
  }
}
