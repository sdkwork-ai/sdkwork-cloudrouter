import 'dart:convert';
import '../http/client.dart';
import '../models.dart';

import 'paths.dart';
import 'response_helpers.dart';


class AiApi {
  final HttpClient _client;

  AiApi(this._client);

  /// List groups
  Future<ChannelGroupsListResult?> channelGroupsList() async {
    final response = await _client.get(ApiPaths.backendPath('/ai/channel_groups'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ChannelGroupsListResult.fromJson(map);
    })();
  }

  /// Create group
  Future<ChannelGroupsCreateResult?> channelGroupsCreate(AdminChannelGroupCreateRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.backendPath('/ai/channel_groups'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ChannelGroupsCreateResult.fromJson(map);
    })();
  }

  /// Delete group
  Future<ChannelGroupsDeleteResult?> channelGroupsDelete(String channelGroupId) async {
    final response = await _client.delete(ApiPaths.backendPath('/ai/channel_groups/${serializePathParameter(channelGroupId, const PathParameterSpec('channelGroupId', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ChannelGroupsDeleteResult.fromJson(map);
    })();
  }

  /// Update group
  Future<ChannelGroupsUpdateResult?> channelGroupsUpdate(String channelGroupId, AdminChannelGroupUpdateRequest body) async {
    final payload = body.toJson();
    final response = await _client.patch(ApiPaths.backendPath('/ai/channel_groups/${serializePathParameter(channelGroupId, const PathParameterSpec('channelGroupId', 'simple', false))}'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ChannelGroupsUpdateResult.fromJson(map);
    })();
  }

  /// List group channel bindings
  Future<ChannelGroupsChannelBindingsListResult?> channelGroupsBindingsList(String channelGroupId) async {
    final response = await _client.get(ApiPaths.backendPath('/ai/channel_groups/${serializePathParameter(channelGroupId, const PathParameterSpec('channelGroupId', 'simple', false))}/channel_bindings'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ChannelGroupsChannelBindingsListResult.fromJson(map);
    })();
  }

  /// Replace group channel bindings
  Future<ChannelGroupsChannelBindingsUpdateResult?> channelGroupsBindingsUpdate(String channelGroupId, AdminChannelGroupChannelBindingsReplaceRequest body) async {
    final payload = body.toJson();
    final response = await _client.put(ApiPaths.backendPath('/ai/channel_groups/${serializePathParameter(channelGroupId, const PathParameterSpec('channelGroupId', 'simple', false))}/channel_bindings'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ChannelGroupsChannelBindingsUpdateResult.fromJson(map);
    })();
  }

  /// List group route explain
  Future<ChannelGroupsRouteExplainRetrieveResult?> channelGroupsRouteExplainRetrieve(String channelGroupId) async {
    final response = await _client.get(ApiPaths.backendPath('/ai/channel_groups/${serializePathParameter(channelGroupId, const PathParameterSpec('channelGroupId', 'simple', false))}/route_explain'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ChannelGroupsRouteExplainRetrieveResult.fromJson(map);
    })();
  }

  /// List model mappings
  Future<ModelMappingsListResult?> modelMappingsList([String? bindingType, String? vendorCode, String? channelId, String? channelCode, String? q]) async {
    final query = buildQueryString([
      QueryParameterSpec('binding_type', bindingType, 'form', true, false, null),
      QueryParameterSpec('vendor_code', vendorCode, 'form', true, false, null),
      QueryParameterSpec('channel_id', channelId, 'form', true, false, null),
      QueryParameterSpec('channel_code', channelCode, 'form', true, false, null),
      QueryParameterSpec('q', q, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.backendPath('/ai/model_mappings'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ModelMappingsListResult.fromJson(map);
    })();
  }

  /// Create model mapping
  Future<ModelMappingsCreateResult?> modelMappingsCreate(AdminModelMappingCreateRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.backendPath('/ai/model_mappings'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ModelMappingsCreateResult.fromJson(map);
    })();
  }

  /// Resolve model mapping
  Future<ModelMappingsResolveCreateResult?> modelMappingsResolveCreate(AdminModelMappingResolveRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.backendPath('/ai/model_mappings/resolve'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ModelMappingsResolveCreateResult.fromJson(map);
    })();
  }

  /// Delete model mapping
  Future<ModelMappingsDeleteResult?> modelMappingsDelete(String mappingId) async {
    final response = await _client.delete(ApiPaths.backendPath('/ai/model_mappings/${serializePathParameter(mappingId, const PathParameterSpec('mappingId', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ModelMappingsDeleteResult.fromJson(map);
    })();
  }

  /// Update model mapping
  Future<ModelMappingsUpdateResult?> modelMappingsUpdate(String mappingId, AdminModelMappingUpdateRequest body) async {
    final payload = body.toJson();
    final response = await _client.patch(ApiPaths.backendPath('/ai/model_mappings/${serializePathParameter(mappingId, const PathParameterSpec('mappingId', 'simple', false))}'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ModelMappingsUpdateResult.fromJson(map);
    })();
  }

  /// List model rankings
  Future<ModelRankingsListResult?> modelRankingsList([String? rankScope, String? vendorCode, String? modality, String? q, String? limit]) async {
    final query = buildQueryString([
      QueryParameterSpec('rank_scope', rankScope, 'form', true, false, null),
      QueryParameterSpec('vendor_code', vendorCode, 'form', true, false, null),
      QueryParameterSpec('modality', modality, 'form', true, false, null),
      QueryParameterSpec('q', q, 'form', true, false, null),
      QueryParameterSpec('limit', limit, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.backendPath('/ai/model_rankings'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ModelRankingsListResult.fromJson(map);
    })();
  }

  /// List model ranking refresh jobs
  Future<ModelRankingsJobsListResult?> modelRankingsJobsList([String? rankScope, String? limit]) async {
    final query = buildQueryString([
      QueryParameterSpec('rank_scope', rankScope, 'form', true, false, null),
      QueryParameterSpec('limit', limit, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.backendPath('/ai/model_rankings/jobs'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ModelRankingsJobsListResult.fromJson(map);
    })();
  }

  /// Trigger model ranking refresh
  Future<ModelRankingsRefreshResult?> modelRankingsRefresh(ModelRankingRefreshTriggerRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.backendPath('/ai/model_rankings/refresh'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ModelRankingsRefreshResult.fromJson(map);
    })();
  }

  /// List model ranking refresh status
  Future<ModelRankingsStatusRetrieveResult?> modelRankingsStatusRetrieve([String? rankScope]) async {
    final query = buildQueryString([
      QueryParameterSpec('rank_scope', rankScope, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.backendPath('/ai/model_rankings/status'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ModelRankingsStatusRetrieveResult.fromJson(map);
    })();
  }

  /// List vendors
  Future<ModelVendorsListResult?> modelVendorsList() async {
    final response = await _client.get(ApiPaths.backendPath('/ai/model_vendors'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ModelVendorsListResult.fromJson(map);
    })();
  }

  /// Create vendor
  Future<ModelVendorsCreateResult?> modelVendorsCreate(AdminModelVendorCreateRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.backendPath('/ai/model_vendors'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ModelVendorsCreateResult.fromJson(map);
    })();
  }

  /// List models
  Future<ModelsListResult?> modelsList() async {
    final response = await _client.get(ApiPaths.backendPath('/ai/models'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ModelsListResult.fromJson(map);
    })();
  }

  /// Create model
  Future<ModelsCreateResult?> modelsCreate(AdminAiModelCreateRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.backendPath('/ai/models'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ModelsCreateResult.fromJson(map);
    })();
  }

  /// Sync vendors and models
  Future<ModelsRefreshResult?> modelsRefresh(AdminModelCatalogSyncRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.backendPath('/ai/models/refresh'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ModelsRefreshResult.fromJson(map);
    })();
  }

  /// Delete model
  Future<ModelsDeleteResult?> modelsDelete(String modelId) async {
    final response = await _client.delete(ApiPaths.backendPath('/ai/models/${serializePathParameter(modelId, const PathParameterSpec('modelId', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ModelsDeleteResult.fromJson(map);
    })();
  }

  /// Update model
  Future<ModelsUpdateResult?> modelsUpdate(String modelId, AdminAiModelUpdateRequest body) async {
    final payload = body.toJson();
    final response = await _client.patch(ApiPaths.backendPath('/ai/models/${serializePathParameter(modelId, const PathParameterSpec('modelId', 'simple', false))}'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ModelsUpdateResult.fromJson(map);
    })();
  }

  /// List resource groups
  Future<AiResourceGroupsListResult?> getResourceGroupsList() async {
    final response = await _client.get(ApiPaths.backendPath('/ai/resource_groups'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : AiResourceGroupsListResult.fromJson(map);
    })();
  }

  /// Create resource group
  Future<AiResourceGroupsCreateResult?> resourceGroupsCreate(AdminAiResourceGroupCreateRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.backendPath('/ai/resource_groups'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : AiResourceGroupsCreateResult.fromJson(map);
    })();
  }

  /// List resource group resources
  Future<AiResourceGroupsResourcesListResult?> getResourceGroupsListResourceGroups(String groupIdOrCode) async {
    final response = await _client.get(ApiPaths.backendPath('/ai/resource_groups/${serializePathParameter(groupIdOrCode, const PathParameterSpec('groupIdOrCode', 'simple', false))}/resources'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : AiResourceGroupsResourcesListResult.fromJson(map);
    })();
  }

  /// Delete resource group
  Future<AiResourceGroupsDeleteResult?> resourceGroupsDelete(String groupId) async {
    final response = await _client.delete(ApiPaths.backendPath('/ai/resource_groups/${serializePathParameter(groupId, const PathParameterSpec('groupId', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : AiResourceGroupsDeleteResult.fromJson(map);
    })();
  }

  /// Update resource group
  Future<AiResourceGroupsUpdateResult?> resourceGroupsUpdate(String groupId, AdminAiResourceGroupUpdateRequest body) async {
    final payload = body.toJson();
    final response = await _client.patch(ApiPaths.backendPath('/ai/resource_groups/${serializePathParameter(groupId, const PathParameterSpec('groupId', 'simple', false))}'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : AiResourceGroupsUpdateResult.fromJson(map);
    })();
  }

  /// List ai resources
  Future<AiResourcesListResult?> resourcesList() async {
    final response = await _client.get(ApiPaths.backendPath('/ai/resources'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : AiResourcesListResult.fromJson(map);
    })();
  }

  /// Create ai resource
  Future<AiResourcesCreateResult?> resourcesCreate(AdminAiResourceCreateRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.backendPath('/ai/resources'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : AiResourcesCreateResult.fromJson(map);
    })();
  }

  /// Update ai resource
  Future<AiResourcesUpdateResult?> resourcesUpdate(String resourceId, AdminAiResourceUpdateRequest body) async {
    final payload = body.toJson();
    final response = await _client.put(ApiPaths.backendPath('/ai/resources/${serializePathParameter(resourceId, const PathParameterSpec('resourceId', 'simple', false))}'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : AiResourcesUpdateResult.fromJson(map);
    })();
  }

  /// List runtime route explain
  Future<RouteExplainCreateResult?> routeExplainCreate(AdminRuntimeRouteExplainRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.backendPath('/ai/route_explain'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : RouteExplainCreateResult.fromJson(map);
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
