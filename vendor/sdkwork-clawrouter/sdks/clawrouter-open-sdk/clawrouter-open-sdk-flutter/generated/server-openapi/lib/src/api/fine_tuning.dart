import 'dart:convert';
import '../http/client.dart';
import '../models.dart';

import 'paths.dart';
import 'response_helpers.dart';


class FineTuningApi {
  final HttpClient _client;

  FineTuningApi(this._client);

  /// Run fine-tuning grader
  Future<OpenAiFineTuningGraderRunResult?> createRun(OpenAiFineTuningGraderRunRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.aiPath('/fine_tuning/alpha/graders/run'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiFineTuningGraderRunResult.fromJson(map);
    })();
  }

  /// Validate fine-tuning grader
  Future<OpenAiFineTuningGraderValidationResult?> createValidate(OpenAiFineTuningGraderValidateRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.aiPath('/fine_tuning/alpha/graders/validate'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiFineTuningGraderValidationResult.fromJson(map);
    })();
  }

  /// List fine-tuning checkpoint permissions
  Future<OpenAiFineTuningCheckpointPermissionList?> retrievePermission(String fineTunedModelCheckpoint, [int? limit, String? order, String? after, String? before, String? projectId]) async {
    final query = buildQueryString([
      QueryParameterSpec('limit', limit, 'form', true, false, null),
      QueryParameterSpec('order', order, 'form', true, false, null),
      QueryParameterSpec('after', after, 'form', true, false, null),
      QueryParameterSpec('before', before, 'form', true, false, null),
      QueryParameterSpec('project_id', projectId, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.aiPath('/fine_tuning/checkpoints/${serializePathParameter(fineTunedModelCheckpoint, const PathParameterSpec('fine_tuned_model_checkpoint', 'simple', false))}/permissions'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiFineTuningCheckpointPermissionList.fromJson(map);
    })();
  }

  /// Create fine-tuning checkpoint permission
  Future<OpenAiFineTuningCheckpointPermission?> createPermission(String fineTunedModelCheckpoint, OpenAiFineTuningCheckpointPermissionCreateRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.aiPath('/fine_tuning/checkpoints/${serializePathParameter(fineTunedModelCheckpoint, const PathParameterSpec('fine_tuned_model_checkpoint', 'simple', false))}/permissions'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiFineTuningCheckpointPermission.fromJson(map);
    })();
  }

  /// Delete fine-tuning checkpoint permission
  Future<DeleteResult?> deletePermission(String fineTunedModelCheckpoint, String permissionId) async {
    final response = await _client.delete(ApiPaths.aiPath('/fine_tuning/checkpoints/${serializePathParameter(fineTunedModelCheckpoint, const PathParameterSpec('fine_tuned_model_checkpoint', 'simple', false))}/permissions/${serializePathParameter(permissionId, const PathParameterSpec('permission_id', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : DeleteResult.fromJson(map);
    })();
  }

  /// List fine-tuning jobs
  Future<OpenAiFineTuningJobList?> listJob([int? limit, String? order, String? after, String? before]) async {
    final query = buildQueryString([
      QueryParameterSpec('limit', limit, 'form', true, false, null),
      QueryParameterSpec('order', order, 'form', true, false, null),
      QueryParameterSpec('after', after, 'form', true, false, null),
      QueryParameterSpec('before', before, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.aiPath('/fine_tuning/jobs'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiFineTuningJobList.fromJson(map);
    })();
  }

  /// Create fine-tuning job
  Future<OpenAiFineTuningJob?> createJob(OpenAiFineTuningJobCreateRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.aiPath('/fine_tuning/jobs'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiFineTuningJob.fromJson(map);
    })();
  }

  /// Retrieve fine-tuning job
  Future<OpenAiFineTuningJob?> retrieveJob(String fineTuningJobId) async {
    final response = await _client.get(ApiPaths.aiPath('/fine_tuning/jobs/${serializePathParameter(fineTuningJobId, const PathParameterSpec('fine_tuning_job_id', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiFineTuningJob.fromJson(map);
    })();
  }

  /// Cancel fine-tuning job
  Future<OpenAiFineTuningJob?> createCancel(String fineTuningJobId) async {
    final response = await _client.post(ApiPaths.aiPath('/fine_tuning/jobs/${serializePathParameter(fineTuningJobId, const PathParameterSpec('fine_tuning_job_id', 'simple', false))}/cancel'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiFineTuningJob.fromJson(map);
    })();
  }

  /// List fine-tuning checkpoints
  Future<OpenAiFineTuningJobCheckpointList?> retrieveCheckpoint(String fineTuningJobId, [int? limit, String? order, String? after, String? before]) async {
    final query = buildQueryString([
      QueryParameterSpec('limit', limit, 'form', true, false, null),
      QueryParameterSpec('order', order, 'form', true, false, null),
      QueryParameterSpec('after', after, 'form', true, false, null),
      QueryParameterSpec('before', before, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.aiPath('/fine_tuning/jobs/${serializePathParameter(fineTuningJobId, const PathParameterSpec('fine_tuning_job_id', 'simple', false))}/checkpoints'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiFineTuningJobCheckpointList.fromJson(map);
    })();
  }

  /// List fine-tuning events
  Future<OpenAiFineTuningJobEventList?> retrieveEvent(String fineTuningJobId, [int? limit, String? order, String? after, String? before]) async {
    final query = buildQueryString([
      QueryParameterSpec('limit', limit, 'form', true, false, null),
      QueryParameterSpec('order', order, 'form', true, false, null),
      QueryParameterSpec('after', after, 'form', true, false, null),
      QueryParameterSpec('before', before, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.aiPath('/fine_tuning/jobs/${serializePathParameter(fineTuningJobId, const PathParameterSpec('fine_tuning_job_id', 'simple', false))}/events'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiFineTuningJobEventList.fromJson(map);
    })();
  }

  /// Pause fine-tuning job
  Future<OpenAiFineTuningJob?> createPause(String fineTuningJobId) async {
    final response = await _client.post(ApiPaths.aiPath('/fine_tuning/jobs/${serializePathParameter(fineTuningJobId, const PathParameterSpec('fine_tuning_job_id', 'simple', false))}/pause'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiFineTuningJob.fromJson(map);
    })();
  }

  /// Resume fine-tuning job
  Future<OpenAiFineTuningJob?> createResume(String fineTuningJobId) async {
    final response = await _client.post(ApiPaths.aiPath('/fine_tuning/jobs/${serializePathParameter(fineTuningJobId, const PathParameterSpec('fine_tuning_job_id', 'simple', false))}/resume'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiFineTuningJob.fromJson(map);
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
class QueryParameterSpec {
  final String name;
  final dynamic value;
  final String style;
  final bool explode;
  final bool allowReserved;
  final String? contentType;

  const QueryParameterSpec(
    this.name,
    this.value,
    this.style,
    this.explode,
    this.allowReserved,
    this.contentType,
  );
}

String buildQueryString(List<QueryParameterSpec> parameters) {
  final pairs = <String>[];
  for (final parameter in parameters) {
    appendSerializedParameter(pairs, parameter);
  }
  return pairs.join('&');
}

void appendSerializedParameter(List<String> pairs, QueryParameterSpec parameter) {
  final value = parameter.value;
  if (value == null) return;

  final contentType = parameter.contentType;
  if (contentType != null && contentType.trim().isNotEmpty) {
    pairs.add('${urlEncode(parameter.name)}=${encodeQueryValue(jsonEncode(value), parameter.allowReserved)}');
    return;
  }

  final style = parameter.style.trim().isEmpty ? 'form' : parameter.style;
  if (style == 'deepObject' && value is Map) {
    appendDeepObjectParameter(pairs, parameter.name, value, parameter.allowReserved);
    return;
  }
  if (value is Iterable) {
    appendArrayParameter(pairs, parameter.name, value, style, parameter.explode, parameter.allowReserved);
    return;
  }
  if (value is Map) {
    appendObjectParameter(pairs, parameter.name, value, style, parameter.explode, parameter.allowReserved);
    return;
  }
  pairs.add('${urlEncode(parameter.name)}=${encodeQueryValue(value.toString(), parameter.allowReserved)}');
}

void appendArrayParameter(
  List<String> pairs,
  String name,
  Iterable values,
  String style,
  bool explode,
  bool allowReserved,
) {
  final serialized = values.where((item) => item != null).map((item) => item.toString()).toList();
  if (serialized.isEmpty) return;
  if (style == 'form' && explode) {
    for (final item in serialized) {
      pairs.add('${urlEncode(name)}=${encodeQueryValue(item, allowReserved)}');
    }
    return;
  }
  pairs.add('${urlEncode(name)}=${encodeQueryValue(serialized.join(','), allowReserved)}');
}

void appendObjectParameter(
  List<String> pairs,
  String name,
  Map values,
  String style,
  bool explode,
  bool allowReserved,
) {
  final serialized = <String>[];
  values.forEach((key, value) {
    if (value == null) return;
    if (style == 'form' && explode) {
      pairs.add('${urlEncode(key.toString())}=${encodeQueryValue(value.toString(), allowReserved)}');
      return;
    }
    serialized.add(key.toString());
    serialized.add(value.toString());
  });
  if (serialized.isNotEmpty) {
    pairs.add('${urlEncode(name)}=${encodeQueryValue(serialized.join(','), allowReserved)}');
  }
}

void appendDeepObjectParameter(List<String> pairs, String name, Map values, bool allowReserved) {
  values.forEach((key, value) {
    if (value != null) {
      pairs.add('${urlEncode('$name[$key]')}=${encodeQueryValue(value.toString(), allowReserved)}');
    }
  });
}

String encodeQueryValue(String value, bool allowReserved) {
  var encoded = urlEncode(value);
  if (!allowReserved) return encoded;
  const replacements = <String, String>{
    '%3A': ':',
    '%2F': '/',
    '%3F': '?',
    '%23': '#',
    '%5B': '[',
    '%5D': ']',
    '%40': '@',
    '%21': '!',
    '%24': r'$',
    '%26': '&',
    '%27': "'",
    '%28': '(',
    '%29': ')',
    '%2A': '*',
    '%2B': '+',
    '%2C': ',',
    '%3B': ';',
    '%3D': '=',
  };
  replacements.forEach((escaped, reserved) {
    encoded = encoded.replaceAll(escaped, reserved);
  });
  return encoded;
}

String urlEncode(String value) => Uri.encodeQueryComponent(value);
