import '../http/client.dart';
import '../models.dart';

import 'paths.dart';
import 'response_helpers.dart';


class ChatAnthropicApi {
  final HttpClient _client;

  ChatAnthropicApi(this._client);

  /// Anthropic Claude message
  Future<AnthropicMessage?> createV1Message(AnthropicMessageCreateRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.aiPath('/anthropic/v1/messages'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : AnthropicMessage.fromJson(map);
    })();
  }

  /// Anthropic count message tokens
  Future<AnthropicCountMessageTokensResponse?> createV1MessagesCountToken(AnthropicCountMessageTokensRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.aiPath('/anthropic/v1/messages/count_tokens'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : AnthropicCountMessageTokensResponse.fromJson(map);
    })();
  }
}
