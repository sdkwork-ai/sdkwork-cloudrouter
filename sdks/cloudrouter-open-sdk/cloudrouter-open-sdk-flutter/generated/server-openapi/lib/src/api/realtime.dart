import '../http/client.dart';
import '../models.dart';

import 'paths.dart';
import 'response_helpers.dart';


class RealtimeApi {
  final HttpClient _client;

  RealtimeApi(this._client);

  /// Create realtime call
  Future<String?> createCall(OpenAiRealtimeCallCreateRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.aiPath('/realtime/calls'), body: payload, contentType: 'application/json');
    return response;
  }

  /// Accept realtime call
  Future<OpenAiRealtimeCall?> createCallsAccept(String callId, OpenAiRealtimeCallActionRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.aiPath('/realtime/calls/${serializePathParameter(callId, const PathParameterSpec('call_id', 'simple', false))}/accept'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiRealtimeCall.fromJson(map);
    })();
  }

  /// Hang up realtime call
  Future<OpenAiRealtimeCall?> createCallsHangup(String callId, OpenAiRealtimeCallActionRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.aiPath('/realtime/calls/${serializePathParameter(callId, const PathParameterSpec('call_id', 'simple', false))}/hangup'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiRealtimeCall.fromJson(map);
    })();
  }

  /// Refer realtime call
  Future<OpenAiRealtimeCall?> createCallsRefer(String callId, OpenAiRealtimeCallReferRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.aiPath('/realtime/calls/${serializePathParameter(callId, const PathParameterSpec('call_id', 'simple', false))}/refer'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiRealtimeCall.fromJson(map);
    })();
  }

  /// Reject realtime call
  Future<OpenAiRealtimeCall?> createCallsReject(String callId, OpenAiRealtimeCallActionRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.aiPath('/realtime/calls/${serializePathParameter(callId, const PathParameterSpec('call_id', 'simple', false))}/reject'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiRealtimeCall.fromJson(map);
    })();
  }

  /// Create realtime client secret
  Future<OpenAiRealtimeClientSecret?> createClientSecret(OpenAiRealtimeClientSecretCreateRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.aiPath('/realtime/client_secrets'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiRealtimeClientSecret.fromJson(map);
    })();
  }

  /// Create realtime session
  Future<OpenAiRealtimeSession?> createSession(OpenAiRealtimeSessionCreateRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.aiPath('/realtime/sessions'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiRealtimeSession.fromJson(map);
    })();
  }

  /// Create realtime transcription session
  Future<OpenAiRealtimeTranscriptionSession?> createTranscriptionSession(OpenAiRealtimeTranscriptionSessionCreateRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.aiPath('/realtime/transcription_sessions'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiRealtimeTranscriptionSession.fromJson(map);
    })();
  }

  /// Create realtime translation session
  Future<OpenAiRealtimeTranslationSession?> createTranslation(OpenAiRealtimeTranslationSessionCreateRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.aiPath('/realtime/translations'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiRealtimeTranslationSession.fromJson(map);
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
