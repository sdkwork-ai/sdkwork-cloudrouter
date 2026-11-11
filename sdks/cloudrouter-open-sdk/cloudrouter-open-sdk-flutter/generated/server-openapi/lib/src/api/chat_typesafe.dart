import '../http/client.dart';
import '../models.dart';

import 'response_helpers.dart';


class ChatTypesafeApi {
  final HttpClient _client;

  ChatTypesafeApi(this._client);

  /// TypeSafe AI System One decision
  Future<TypeSafeSystemOneResponse?> createV1Systemone(TypeSafeSystemOneRequest body) async {
    final payload = body.toJson();
    final response = await _client.post('/typesafe/v1/systemone', body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : TypeSafeSystemOneResponse.fromJson(map);
    })();
  }
}
