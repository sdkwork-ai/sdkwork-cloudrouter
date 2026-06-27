import 'dart:convert';
import '../http/client.dart';
import '../models.dart';

import 'paths.dart';
import 'response_helpers.dart';


class SystemApi {
  final HttpClient _client;

  SystemApi(this._client);

  /// List overview
  Future<AnalyticsAdminOverviewRetrieveResult?> analyticsAdminOverviewRetrieve([String? timeRange, String? startTime, String? endTime, String? limit]) async {
    final query = buildQueryString([
      QueryParameterSpec('time_range', timeRange, 'form', true, false, null),
      QueryParameterSpec('start_time', startTime, 'form', true, false, null),
      QueryParameterSpec('end_time', endTime, 'form', true, false, null),
      QueryParameterSpec('limit', limit, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.backendPath('/system/analytics/admin/overview'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : AnalyticsAdminOverviewRetrieveResult.fromJson(map);
    })();
  }

  /// Retrieve IAM auth runtime settings
  Future<AuthSettingsRetrieveResult?> authSettingsRetrieve() async {
    final response = await _client.get(ApiPaths.backendPath('/system/auth/settings'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : AuthSettingsRetrieveResult.fromJson(map);
    })();
  }

  /// Update IAM auth runtime settings
  Future<AuthSettingsUpdateResult?> authSettingsUpdate(AdminAuthSettingsUpdateRequest body) async {
    final payload = body.toJson();
    final response = await _client.patch(ApiPaths.backendPath('/system/auth/settings'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : AuthSettingsUpdateResult.fromJson(map);
    })();
  }

  /// Delete one runtime cache instance
  Future<CacheInstancesDeleteResult?> cacheInstancesDelete(String instanceName) async {
    final response = await _client.delete(ApiPaths.backendPath('/system/cache/instances/${serializePathParameter(instanceName, const PathParameterSpec('instanceName', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : CacheInstancesDeleteResult.fromJson(map);
    })();
  }

  /// Refresh one runtime cache instance
  Future<CacheInstancesRefreshCreateResult?> cacheInstancesRefreshCreate(String instanceName) async {
    final response = await _client.post(ApiPaths.backendPath('/system/cache/instances/${serializePathParameter(instanceName, const PathParameterSpec('instanceName', 'simple', false))}/refresh'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : CacheInstancesRefreshCreateResult.fromJson(map);
    })();
  }

  /// Delete a runtime cache namespace
  Future<CacheNamespacesDeleteResult?> cacheNamespacesDelete(String namespace) async {
    final response = await _client.delete(ApiPaths.backendPath('/system/cache/namespaces/${serializePathParameter(namespace, const PathParameterSpec('namespace', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : CacheNamespacesDeleteResult.fromJson(map);
    })();
  }

  /// List runtime cache keys in a namespace
  Future<CacheNamespacesKeysListResult?> cacheNamespacesKeysList(String namespace, [String? limit, String? cursor]) async {
    final query = buildQueryString([
      QueryParameterSpec('limit', limit, 'form', true, false, null),
      QueryParameterSpec('cursor', cursor, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.backendPath('/system/cache/namespaces/${serializePathParameter(namespace, const PathParameterSpec('namespace', 'simple', false))}/keys'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : CacheNamespacesKeysListResult.fromJson(map);
    })();
  }

  /// Delete a runtime cache key
  Future<CacheNamespacesKeysDeleteResult?> cacheNamespacesKeysDelete(String namespace, String key) async {
    final response = await _client.delete(ApiPaths.backendPath('/system/cache/namespaces/${serializePathParameter(namespace, const PathParameterSpec('namespace', 'simple', false))}/keys/${serializePathParameter(key, const PathParameterSpec('key', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : CacheNamespacesKeysDeleteResult.fromJson(map);
    })();
  }

  /// Refresh one runtime cache namespace
  Future<CacheNamespacesRefreshCreateResult?> cacheNamespacesRefreshCreate(String namespace) async {
    final response = await _client.post(ApiPaths.backendPath('/system/cache/namespaces/${serializePathParameter(namespace, const PathParameterSpec('namespace', 'simple', false))}/refresh'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : CacheNamespacesRefreshCreateResult.fromJson(map);
    })();
  }

  /// Retrieve runtime cache overview
  Future<CacheOverviewRetrieveResult?> cacheOverviewRetrieve() async {
    final response = await _client.get(ApiPaths.backendPath('/system/cache/overview'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : CacheOverviewRetrieveResult.fromJson(map);
    })();
  }

  /// Refresh all runtime cache instances
  Future<CacheRefreshCreateResult?> cacheRefreshCreate() async {
    final response = await _client.post(ApiPaths.backendPath('/system/cache/refresh'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : CacheRefreshCreateResult.fromJson(map);
    })();
  }

  /// List dashboard data
  Future<DashboardAdminOverviewRetrieveResult?> dashboardAdminOverviewRetrieve() async {
    final response = await _client.get(ApiPaths.backendPath('/system/dashboard/admin/overview'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : DashboardAdminOverviewRetrieveResult.fromJson(map);
    })();
  }

  /// List firewalls
  Future<FirewallsRulesListResult?> firewallsRulesList() async {
    final response = await _client.get(ApiPaths.backendPath('/system/firewalls/rules'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : FirewallsRulesListResult.fromJson(map);
    })();
  }

  /// Create firewall
  Future<FirewallsRulesCreateResult?> firewallsRulesCreate(AdminFirewallRuleCreateRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.backendPath('/system/firewalls/rules'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : FirewallsRulesCreateResult.fromJson(map);
    })();
  }

  /// Delete firewall
  Future<FirewallsRulesDeleteResult?> firewallsRulesDelete(String ruleId) async {
    final response = await _client.delete(ApiPaths.backendPath('/system/firewalls/rules/${serializePathParameter(ruleId, const PathParameterSpec('ruleId', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : FirewallsRulesDeleteResult.fromJson(map);
    })();
  }

  /// List installation status
  Future<InstallationStatusRetrieveResult?> installationStatusRetrieve() async {
    final response = await _client.get(ApiPaths.backendPath('/system/installation/status'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : InstallationStatusRetrieveResult.fromJson(map);
    })();
  }

  /// List referral stats
  Future<MarketingReferralStatsListResult?> marketingReferralStatsList() async {
    final response = await _client.get(ApiPaths.backendPath('/system/marketing/referral_stats'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : MarketingReferralStatsListResult.fromJson(map);
    })();
  }

  /// List alerts
  Future<MonitorAlertsListResult?> monitorAlertsList() async {
    final response = await _client.get(ApiPaths.backendPath('/system/monitor/alerts'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : MonitorAlertsListResult.fromJson(map);
    })();
  }

  /// List nodes
  Future<MonitorNodesListResult?> monitorNodesList() async {
    final response = await _client.get(ApiPaths.backendPath('/system/monitor/nodes'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : MonitorNodesListResult.fromJson(map);
    })();
  }

  /// List performance data
  Future<MonitorPerformanceListResult?> monitorPerformanceList() async {
    final response = await _client.get(ApiPaths.backendPath('/system/monitor/performance'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : MonitorPerformanceListResult.fromJson(map);
    })();
  }

  /// List token limits
  Future<RateLimitsApiKeysListResult?> rateLimitsApiKeysList() async {
    final response = await _client.get(ApiPaths.backendPath('/system/rate_limits/api_keys'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : RateLimitsApiKeysListResult.fromJson(map);
    })();
  }

  /// Create token limit
  Future<RateLimitsApiKeysCreateResult?> rateLimitsApiKeysCreate(AdminTokenLimitCreateRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.backendPath('/system/rate_limits/api_keys'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : RateLimitsApiKeysCreateResult.fromJson(map);
    })();
  }

  /// List IP limits
  Future<RateLimitsIpListResult?> rateLimitsIpList() async {
    final response = await _client.get(ApiPaths.backendPath('/system/rate_limits/ip'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : RateLimitsIpListResult.fromJson(map);
    })();
  }

  /// Create IP limit
  Future<RateLimitsIpCreateResult?> rateLimitsIpCreate(AdminIpLimitCreateRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.backendPath('/system/rate_limits/ip'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : RateLimitsIpCreateResult.fromJson(map);
    })();
  }

  /// List model limits
  Future<RateLimitsModelsListResult?> rateLimitsModelsList() async {
    final response = await _client.get(ApiPaths.backendPath('/system/rate_limits/models'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : RateLimitsModelsListResult.fromJson(map);
    })();
  }

  /// Create model limit
  Future<RateLimitsModelsCreateResult?> rateLimitsModelsCreate(AdminModelLimitCreateRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.backendPath('/system/rate_limits/models'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : RateLimitsModelsCreateResult.fromJson(map);
    })();
  }

  /// List logs
  Future<RecordsListResult?> recordsList([String? page, String? pageSize, String? user, String? token, String? model]) async {
    final query = buildQueryString([
      QueryParameterSpec('page', page, 'form', true, false, null),
      QueryParameterSpec('page_size', pageSize, 'form', true, false, null),
      QueryParameterSpec('user', user, 'form', true, false, null),
      QueryParameterSpec('token', token, 'form', true, false, null),
      QueryParameterSpec('model', model, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.backendPath('/system/records'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : RecordsListResult.fromJson(map);
    })();
  }

  /// Retrieve runtime region settings
  Future<RuntimeRegionSettingsRetrieveResult?> runtimeRegionSettingsRetrieve() async {
    final response = await _client.get(ApiPaths.backendPath('/system/runtime_region/settings'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : RuntimeRegionSettingsRetrieveResult.fromJson(map);
    })();
  }

  /// Update runtime region settings
  Future<RuntimeRegionSettingsUpdateResult?> runtimeRegionSettingsUpdate(AdminRuntimeRegionSettingsUpdateRequest body) async {
    final payload = body.toJson();
    final response = await _client.patch(ApiPaths.backendPath('/system/runtime_region/settings'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : RuntimeRegionSettingsUpdateResult.fromJson(map);
    })();
  }

  /// List service nodes
  Future<ServiceNodesListResult?> serviceNodesList([String? q, String? status]) async {
    final query = buildQueryString([
      QueryParameterSpec('q', q, 'form', true, false, null),
      QueryParameterSpec('status', status, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.backendPath('/system/service_nodes'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ServiceNodesListResult.fromJson(map);
    })();
  }

  /// Create service node
  Future<ServiceNodesCreateResult?> serviceNodesCreate(AdminServiceNodeCreateRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.backendPath('/system/service_nodes'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ServiceNodesCreateResult.fromJson(map);
    })();
  }

  /// Delete service node
  Future<ServiceNodesDeleteResult?> serviceNodesDelete(String nodeId) async {
    final response = await _client.delete(ApiPaths.backendPath('/system/service_nodes/${serializePathParameter(nodeId, const PathParameterSpec('nodeId', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ServiceNodesDeleteResult.fromJson(map);
    })();
  }

  /// Update service node
  Future<ServiceNodesUpdateResult?> serviceNodesUpdate(String nodeId, AdminServiceNodeUpdateRequest body) async {
    final payload = body.toJson();
    final response = await _client.put(ApiPaths.backendPath('/system/service_nodes/${serializePathParameter(nodeId, const PathParameterSpec('nodeId', 'simple', false))}'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ServiceNodesUpdateResult.fromJson(map);
    })();
  }

  /// Update service node status
  Future<ServiceNodesStatusUpdateResult?> serviceNodesStatusUpdate(String nodeId, AdminServiceNodeStatusUpdateRequest body) async {
    final payload = body.toJson();
    final response = await _client.put(ApiPaths.backendPath('/system/service_nodes/${serializePathParameter(nodeId, const PathParameterSpec('nodeId', 'simple', false))}/status'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : ServiceNodesStatusUpdateResult.fromJson(map);
    })();
  }

  /// Retrieve site branding and deployment personalization settings
  Future<SiteSettingsRetrieveResult?> siteSettingsRetrieve() async {
    final response = await _client.get(ApiPaths.backendPath('/system/site/settings'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SiteSettingsRetrieveResult.fromJson(map);
    })();
  }

  /// Update site branding and deployment personalization settings
  Future<SiteSettingsUpdateResult?> siteSettingsUpdate(AdminSiteSettingsUpdateRequest body) async {
    final payload = body.toJson();
    final response = await _client.patch(ApiPaths.backendPath('/system/site/settings'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : SiteSettingsUpdateResult.fromJson(map);
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
