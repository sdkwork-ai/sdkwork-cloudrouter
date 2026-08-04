import '../http/client.dart';
import '../models.dart';

import 'paths.dart';
import 'response_helpers.dart';


class IntegrationApi {
  final HttpClient _client;

  IntegrationApi(this._client);

  /// List
  Future<ChannelsListResult?> channelsList() async {
    final response = await _client.get(ApiPaths.backendPath('/integration/channels'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ChannelsListResult.fromJson(map);
    })();
  }

  /// Create
  Future<ChannelsCreateResult?> channelsCreate() async {
    final response = await _client.post(ApiPaths.backendPath('/integration/channels'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ChannelsCreateResult.fromJson(map);
    })();
  }

  /// Update
  Future<ChannelsUpdateResult?> channelsUpdate() async {
    final response = await _client.put(ApiPaths.backendPath('/integration/channels'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ChannelsUpdateResult.fromJson(map);
    })();
  }

  /// Delete
  Future<ChannelsDeleteResult?> channelsDelete(String channelId) async {
    final response = await _client.delete(ApiPaths.backendPath('/integration/channels/${serializePathParameter(channelId, const PathParameterSpec('channelId', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ChannelsDeleteResult.fromJson(map);
    })();
  }

  /// Verify
  Future<ChannelsVerifyResult?> channelsVerify(String channelId) async {
    final response = await _client.post(ApiPaths.backendPath('/integration/channels/${serializePathParameter(channelId, const PathParameterSpec('channelId', 'simple', false))}/verify'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ChannelsVerifyResult.fromJson(map);
    })();
  }

  /// List
  Future<ProviderSecretsListResult?> providerSecretsList() async {
    final response = await _client.get(ApiPaths.backendPath('/integration/provider_secrets'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ProviderSecretsListResult.fromJson(map);
    })();
  }

  /// Create
  Future<ProviderSecretsCreateResult?> providerSecretsCreate() async {
    final response = await _client.post(ApiPaths.backendPath('/integration/provider_secrets'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ProviderSecretsCreateResult.fromJson(map);
    })();
  }

  /// Update
  Future<ProviderSecretsUpdateResult?> providerSecretsUpdate() async {
    final response = await _client.put(ApiPaths.backendPath('/integration/provider_secrets'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ProviderSecretsUpdateResult.fromJson(map);
    })();
  }

  /// Delete
  Future<ProviderSecretsDeleteResult?> providerSecretsDelete(String secretId) async {
    final response = await _client.delete(ApiPaths.backendPath('/integration/provider_secrets/${serializePathParameter(secretId, const PathParameterSpec('secretId', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ProviderSecretsDeleteResult.fromJson(map);
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
