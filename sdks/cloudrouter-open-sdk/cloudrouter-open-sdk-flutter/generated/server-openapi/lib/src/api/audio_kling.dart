import '../http/client.dart';
import '../models.dart';

import 'response_helpers.dart';


class AudioKlingApi {
  final HttpClient _client;

  AudioKlingApi(this._client);

  /// Kling text to audio
  Future<KlingAudioTask?> createV1AudioTextToAudio(KlingSoundGenerationRequest body) async {
    final payload = body.toJson();
    final response = await _client.post('/kling/v1/audio/text-to-audio', body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : KlingAudioTask.fromJson(map);
    })();
  }

  /// Kling retrieve text to audio task
  Future<KlingAudioTask?> listV1AudioTextToAudio(String taskId) async {
    final response = await _client.get('/kling/v1/audio/text-to-audio/${serializePathParameter(taskId, const PathParameterSpec('task_id', 'simple', false))}');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : KlingAudioTask.fromJson(map);
    })();
  }

  /// Kling video to audio
  Future<KlingAudioTask?> createV1AudioVideoToAudio(KlingVideoToAudioRequest body) async {
    final payload = body.toJson();
    final response = await _client.post('/kling/v1/audio/video-to-audio', body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : KlingAudioTask.fromJson(map);
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
