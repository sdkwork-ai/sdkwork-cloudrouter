import '../http/client.dart';
import '../models.dart';

import 'paths.dart';
import 'response_helpers.dart';


class ChatApi {
  final HttpClient _client;

  ChatApi(this._client);

  /// List
  Future<ConversationsListResult?> conversationsList() async {
    final response = await _client.get(ApiPaths.appPath('/chat/conversations'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ConversationsListResult.fromJson(map);
    })();
  }

  /// Create
  Future<ConversationsCreateResult?> conversationsCreate() async {
    final response = await _client.post(ApiPaths.appPath('/chat/conversations'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ConversationsCreateResult.fromJson(map);
    })();
  }

  /// Retrieve
  Future<ConversationsRetrieveResult?> conversationsRetrieve(String conversationId) async {
    final response = await _client.get(ApiPaths.appPath('/chat/conversations/${serializePathParameter(conversationId, const PathParameterSpec('conversationId', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ConversationsRetrieveResult.fromJson(map);
    })();
  }

  /// List
  Future<ConversationMessagesListResult?> conversationMessagesList(String conversationId) async {
    final response = await _client.get(ApiPaths.appPath('/chat/conversations/${serializePathParameter(conversationId, const PathParameterSpec('conversationId', 'simple', false))}/messages'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ConversationMessagesListResult.fromJson(map);
    })();
  }

  /// Create
  Future<TurnsCreateResult?> turnsCreate(String conversationId) async {
    final response = await _client.post(ApiPaths.appPath('/chat/conversations/${serializePathParameter(conversationId, const PathParameterSpec('conversationId', 'simple', false))}/turns'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : TurnsCreateResult.fromJson(map);
    })();
  }

  /// Create
  Future<TurnResponsesCreateResult?> turnResponsesCreate(String conversationId, String turnId) async {
    final response = await _client.post(ApiPaths.appPath('/chat/conversations/${serializePathParameter(conversationId, const PathParameterSpec('conversationId', 'simple', false))}/turns/${serializePathParameter(turnId, const PathParameterSpec('turnId', 'simple', false))}/response'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : TurnResponsesCreateResult.fromJson(map);
    })();
  }
}

class PathParameterSpec {
  final String name;
  final String style;
  final bool explode;

  const PathParameterSpec(this.name, this.style, this.explode);
}

String serializePathParameter(dynamic value, PathParameterSpec spec) {
  if (value == null) return '';
  final style = spec.style.trim().isEmpty ? 'simple' : spec.style;
  if (value is Iterable) {
    return serializePathArray(spec.name, value, style, spec.explode);
  }
  if (value is Map) {
    return serializePathObject(spec.name, value, style, spec.explode);
  }
  return pathPrimitivePrefix(spec.name, style) + Uri.encodeComponent(value.toString());
}

String serializePathArray(String name, Iterable values, String style, bool explode) {
  final serialized = values.where((item) => item != null).map((item) => Uri.encodeComponent(item.toString())).toList();
  if (serialized.isEmpty) return pathPrefix(name, style);
  if (style == 'matrix') {
    if (explode) {
      return serialized.map((item) => ';$name=$item').join();
    }
    return ';$name=${serialized.join(',')}';
  }
  final separator = explode ? '.' : ',';
  return pathPrefix(name, style) + serialized.join(separator);
}

String serializePathObject(String name, Map values, String style, bool explode) {
  final entries = <String>[];
  final exploded = <String>[];
  values.forEach((key, value) {
    if (value == null) return;
    final escapedKey = Uri.encodeComponent(key.toString());
    final escapedValue = Uri.encodeComponent(value.toString());
    if (explode) {
      if (style == 'matrix') {
        exploded.add(';$escapedKey=$escapedValue');
      } else {
        exploded.add('$escapedKey=$escapedValue');
      }
    } else {
      entries.add(escapedKey);
      entries.add(escapedValue);
    }
  });
  if (style == 'matrix') {
    if (explode) return exploded.join();
    return ';$name=${entries.join(',')}';
  }
  if (explode) {
    final separator = style == 'label' ? '.' : ',';
    return pathPrefix(name, style) + exploded.join(separator);
  }
  return pathPrefix(name, style) + entries.join(',');
}

String pathPrefix(String name, String style) {
  if (style == 'label') return '.';
  if (style == 'matrix') return ';$name';
  return '';
}

String pathPrimitivePrefix(String name, String style) {
  return style == 'matrix' ? ';$name=' : pathPrefix(name, style);
}
