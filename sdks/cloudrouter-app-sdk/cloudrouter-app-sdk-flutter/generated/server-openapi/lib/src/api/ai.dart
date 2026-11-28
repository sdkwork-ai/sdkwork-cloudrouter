import 'dart:convert';
import '../http/client.dart';
import '../models.dart';

import 'paths.dart';
import 'response_helpers.dart';


class AiApi {
  final HttpClient _client;

  AiApi(this._client);

  /// Resolve console hardware agents
  Future<AgentsListResult?> agentsList() async {
    final response = await _client.get(ApiPaths.appPath('/ai/agents'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : AgentsListResult.fromJson(map);
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
  Future<GatewayTracesListResult?> gatewayTracesList([String? cursor, int? pageSize, String? q]) async {
    final query = buildQueryString([
      QueryParameterSpec('cursor', cursor, 'form', true, false, null),
      QueryParameterSpec('page_size', pageSize, 'form', true, false, null),
      QueryParameterSpec('q', q, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.appPath('/ai/gateway/traces'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : GatewayTracesListResult.fromJson(map);
    })();
  }

  /// List official pricing rates
  Future<PricingRatesListResult?> pricingRatesList([String? category, String? q, String? vendorCode, String? regionCode, String? meterCode, String? currencyCode, int? page, int? pageSize]) async {
    final query = buildQueryString([
      QueryParameterSpec('category', category, 'form', true, false, null),
      QueryParameterSpec('q', q, 'form', true, false, null),
      QueryParameterSpec('vendor_code', vendorCode, 'form', true, false, null),
      QueryParameterSpec('region_code', regionCode, 'form', true, false, null),
      QueryParameterSpec('meter_code', meterCode, 'form', true, false, null),
      QueryParameterSpec('currency_code', currencyCode, 'form', true, false, null),
      QueryParameterSpec('page', page, 'form', true, false, null),
      QueryParameterSpec('page_size', pageSize, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.appPath('/ai/pricing/rates'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : PricingRatesListResult.fromJson(map);
    })();
  }

  /// List routing account groups
  Future<RoutingAccountGroupsListResult?> routingAccountGroupsList([int? page, int? pageSize, String? q]) async {
    final query = buildQueryString([
      QueryParameterSpec('page', page, 'form', true, false, null),
      QueryParameterSpec('page_size', pageSize, 'form', true, false, null),
      QueryParameterSpec('q', q, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.appPath('/ai/routing/account_groups'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : RoutingAccountGroupsListResult.fromJson(map);
    })();
  }

  /// List routing API keys
  Future<RoutingApiKeysListResult?> routingApiKeysList([int? page, int? pageSize, String? q]) async {
    final query = buildQueryString([
      QueryParameterSpec('page', page, 'form', true, false, null),
      QueryParameterSpec('page_size', pageSize, 'form', true, false, null),
      QueryParameterSpec('q', q, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.appPath('/ai/routing/api_keys'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : RoutingApiKeysListResult.fromJson(map);
    })();
  }

  /// List model group catalog
  Future<RoutingModelGroupCatalogRetrieveResult?> routingModelGroupCatalogRetrieve([String? modality, String? vendorCode]) async {
    final query = buildQueryString([
      QueryParameterSpec('modality', modality, 'form', true, false, null),
      QueryParameterSpec('vendor_code', vendorCode, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.appPath('/ai/routing/model_group_catalog'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : RoutingModelGroupCatalogRetrieveResult.fromJson(map);
    })();
  }

  /// List model group defaults
  Future<RoutingModelGroupDefaultsRetrieveResult?> routingModelGroupDefaultsRetrieve() async {
    final response = await _client.get(ApiPaths.appPath('/ai/routing/model_group_defaults'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : RoutingModelGroupDefaultsRetrieveResult.fromJson(map);
    })();
  }

  /// Set model group default
  Future<RoutingModelGroupDefaultsUpdateResult?> routingModelGroupDefaultsUpdate(AppRoutingModelGroupDefaultRequest body) async {
    final payload = body.toJson();
    final response = await _client.put(ApiPaths.appPath('/ai/routing/model_group_defaults'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : RoutingModelGroupDefaultsUpdateResult.fromJson(map);
    })();
  }

  /// List model groups
  Future<RoutingModelGroupsRetrieveResult?> routingModelGroupsRetrieve(String model) async {
    final query = buildQueryString([
      QueryParameterSpec('model', model, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.appPath('/ai/routing/model_groups'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : RoutingModelGroupsRetrieveResult.fromJson(map);
    })();
  }

  /// List routing request traces
  Future<RoutingRequestTracesListResult?> routingRequestTracesList([String? cursor, int? pageSize, String? q]) async {
    final query = buildQueryString([
      QueryParameterSpec('cursor', cursor, 'form', true, false, null),
      QueryParameterSpec('page_size', pageSize, 'form', true, false, null),
      QueryParameterSpec('q', q, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.appPath('/ai/routing/request_traces'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : RoutingRequestTracesListResult.fromJson(map);
    })();
  }

  /// List routing usage
  Future<RoutingUsageRetrieveResult?> routingUsageRetrieve() async {
    final response = await _client.get(ApiPaths.appPath('/ai/routing/usage'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : RoutingUsageRetrieveResult.fromJson(map);
    })();
  }

  /// List settlements dashboard
  Future<SettlementsDashboardRetrieveResult?> settlementsDashboardRetrieve([String? year]) async {
    final query = buildQueryString([
      QueryParameterSpec('year', year, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.appPath('/ai/settlements/dashboard'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SettlementsDashboardRetrieveResult.fromJson(map);
    })();
  }

  /// List logs
  Future<UsageLogsListResult?> usageLogsList([String? cursor, int? pageSize, String? q, String? status, String? startTime, String? endTime]) async {
    final query = buildQueryString([
      QueryParameterSpec('cursor', cursor, 'form', true, false, null),
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
