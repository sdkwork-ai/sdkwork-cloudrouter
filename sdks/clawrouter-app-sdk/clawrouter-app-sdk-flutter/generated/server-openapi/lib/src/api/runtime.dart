import '../http/client.dart';
import '../models.dart';

import 'paths.dart';
import 'response_helpers.dart';


class RuntimeApi {
  final HttpClient _client;

  RuntimeApi(this._client);

  /// List
  Future<InvocationsListResult?> invocationsList() async {
    final response = await _client.get(ApiPaths.appPath('/runtime/invocations'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : InvocationsListResult.fromJson(map);
    })();
  }

  /// Create
  Future<InvocationsCreateResult?> invocationsCreate() async {
    final response = await _client.post(ApiPaths.appPath('/runtime/invocations'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : InvocationsCreateResult.fromJson(map);
    })();
  }

  /// Retrieve
  Future<InvocationsRetrieveResult?> invocationsRetrieve(String invocationId) async {
    final response = await _client.get(ApiPaths.appPath('/runtime/invocations/${serializePathParameter(invocationId, const PathParameterSpec('invocationId', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : InvocationsRetrieveResult.fromJson(map);
    })();
  }

  /// List
  Future<ArtifactsListResult?> artifactsList(String invocationId) async {
    final response = await _client.get(ApiPaths.appPath('/runtime/invocations/${serializePathParameter(invocationId, const PathParameterSpec('invocationId', 'simple', false))}/artifacts'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ArtifactsListResult.fromJson(map);
    })();
  }

  /// Create
  Future<ArtifactsCreateResult?> artifactsCreate(String invocationId) async {
    final response = await _client.post(ApiPaths.appPath('/runtime/invocations/${serializePathParameter(invocationId, const PathParameterSpec('invocationId', 'simple', false))}/artifacts'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ArtifactsCreateResult.fromJson(map);
    })();
  }

  /// Create
  Future<InvocationsSubmitResult?> invocationsSubmit(String invocationId) async {
    final response = await _client.post(ApiPaths.appPath('/runtime/invocations/${serializePathParameter(invocationId, const PathParameterSpec('invocationId', 'simple', false))}/complete'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : InvocationsSubmitResult.fromJson(map);
    })();
  }

  /// List
  Future<InvocationEventsListResult?> invocationEventsList(String invocationId) async {
    final response = await _client.get(ApiPaths.appPath('/runtime/invocations/${serializePathParameter(invocationId, const PathParameterSpec('invocationId', 'simple', false))}/events'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : InvocationEventsListResult.fromJson(map);
    })();
  }

  /// Create
  Future<InvocationEventsCreateResult?> invocationEventsCreate(String invocationId) async {
    final response = await _client.post(ApiPaths.appPath('/runtime/invocations/${serializePathParameter(invocationId, const PathParameterSpec('invocationId', 'simple', false))}/events'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : InvocationEventsCreateResult.fromJson(map);
    })();
  }

  /// List
  Future<InvocationEventStreamsListResult?> invocationEventStreamsList(String invocationId) async {
    final response = await _client.get(ApiPaths.appPath('/runtime/invocations/${serializePathParameter(invocationId, const PathParameterSpec('invocationId', 'simple', false))}/events/stream'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : InvocationEventStreamsListResult.fromJson(map);
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
