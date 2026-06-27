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
    final response = await _client.get(ApiPaths.appPath('/ai/channel_groups'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ChannelGroupsListResult.fromJson(map);
    })();
  }

  /// List dashboard overview
  Future<DashboardOverviewRetrieveResult?> dashboardOverviewRetrieve([String? timeRange, String? startTime, String? endTime]) async {
    final query = buildQueryString([
      QueryParameterSpec('time_range', timeRange, 'form', true, false, null),
      QueryParameterSpec('start_time', startTime, 'form', true, false, null),
      QueryParameterSpec('end_time', endTime, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.appPath('/ai/dashboard/overview'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : DashboardOverviewRetrieveResult.fromJson(map);
    })();
  }

  /// List traces
  Future<GatewayTracesListResult?> gatewayTracesList() async {
    final response = await _client.get(ApiPaths.appPath('/ai/gateway/traces'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : GatewayTracesListResult.fromJson(map);
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
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.appPath('/ai/model_rankings'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ModelRankingsListResult.fromJson(map);
    })();
  }

  /// List ranking vendor filters
  Future<ModelVendorsListResult?> modelVendorsList() async {
    final response = await _client.get(ApiPaths.appPath('/ai/model_vendors'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ModelVendorsListResult.fromJson(map);
    })();
  }

  /// List model catalog for Playground
  Future<ModelsListResult?> modelsList([String? billingMeter, String? vendorCode, List<String>? vendorCodes, List<String>? modalities, List<String>? capabilities, List<String>? categories, List<String>? groups, String? q, String? limit, String? offset]) async {
    final query = buildQueryString([
      QueryParameterSpec('billing_meter', billingMeter, 'form', true, false, null),
      QueryParameterSpec('vendor_code', vendorCode, 'form', true, false, null),
      QueryParameterSpec('vendor_codes', vendorCodes, 'form', false, false, null),
      QueryParameterSpec('modalities', modalities, 'form', false, false, null),
      QueryParameterSpec('capabilities', capabilities, 'form', false, false, null),
      QueryParameterSpec('categories', categories, 'form', false, false, null),
      QueryParameterSpec('groups', groups, 'form', false, false, null),
      QueryParameterSpec('q', q, 'form', true, false, null),
      QueryParameterSpec('limit', limit, 'form', true, false, null),
      QueryParameterSpec('offset', offset, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.appPath('/ai/models'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ModelsListResult.fromJson(map);
    })();
  }

  /// List routing API keys
  Future<RoutingApiKeysListResult?> routingApiKeysList() async {
    final response = await _client.get(ApiPaths.appPath('/ai/routing/api_keys'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : RoutingApiKeysListResult.fromJson(map);
    })();
  }

  /// List routing channels
  Future<RoutingChannelsListResult?> routingChannelsList() async {
    final response = await _client.get(ApiPaths.appPath('/ai/routing/channels'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : RoutingChannelsListResult.fromJson(map);
    })();
  }

  /// List routing request traces
  Future<RoutingRequestTracesListResult?> routingRequestTracesList() async {
    final response = await _client.get(ApiPaths.appPath('/ai/routing/request_traces'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : RoutingRequestTracesListResult.fromJson(map);
    })();
  }

  /// List routing usage
  Future<RoutingUsageListResult?> routingUsageList() async {
    final response = await _client.get(ApiPaths.appPath('/ai/routing/usage'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : RoutingUsageListResult.fromJson(map);
    })();
  }

  /// List logs
  Future<UsageLogsListResult?> usageLogsList([String? page, String? pageSize, String? q, String? status, String? startTime, String? endTime]) async {
    final query = buildQueryString([
      QueryParameterSpec('page', page, 'form', true, false, null),
      QueryParameterSpec('page_size', pageSize, 'form', true, false, null),
      QueryParameterSpec('q', q, 'form', true, false, null),
      QueryParameterSpec('status', status, 'form', true, false, null),
      QueryParameterSpec('start_time', startTime, 'form', true, false, null),
      QueryParameterSpec('end_time', endTime, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.appPath('/ai/usage/logs'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : UsageLogsListResult.fromJson(map);
    })();
  }
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
