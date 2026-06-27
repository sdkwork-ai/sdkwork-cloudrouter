import Foundation

public class SystemApi {
    private let client: HttpClient

    public init(client: HttpClient) {
        self.client = client
    }

    /// List overview
    public func analyticsAdminOverviewRetrieve(timeRange: String? = nil, startTime: String? = nil, endTime: String? = nil, limit: String? = nil) async throws -> AnalyticsAdminOverviewRetrieveResult? {
        let query = buildQueryString([
            QueryParameterSpec(name: "time_range", value: timeRange, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "start_time", value: startTime, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "end_time", value: endTime, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "limit", value: limit, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/system/analytics/admin/overview"), query), responseType: AnalyticsAdminOverviewRetrieveResult.self)
    }

    /// Retrieve IAM auth runtime settings
    public func authSettingsRetrieve() async throws -> AuthSettingsRetrieveResult? {
        return try await client.get(ApiPaths.backendPath("/system/auth/settings"), responseType: AuthSettingsRetrieveResult.self)
    }

    /// Update IAM auth runtime settings
    public func authSettingsUpdate(body: AdminAuthSettingsUpdateRequest) async throws -> AuthSettingsUpdateResult? {
        return try await client.patch(ApiPaths.backendPath("/system/auth/settings"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: AuthSettingsUpdateResult.self)
    }

    /// Delete one runtime cache instance
    public func cacheInstancesDelete(instanceName: String) async throws -> CacheInstancesDeleteResult? {
        return try await client.delete(ApiPaths.backendPath("/system/cache/instances/\(serializePathParameter(instanceName, PathParameterSpec(name: "instanceName", style: "simple", explode: false)))"), responseType: CacheInstancesDeleteResult.self)
    }

    /// Refresh one runtime cache instance
    public func cacheInstancesRefreshCreate(instanceName: String) async throws -> CacheInstancesRefreshCreateResult? {
        return try await client.post(ApiPaths.backendPath("/system/cache/instances/\(serializePathParameter(instanceName, PathParameterSpec(name: "instanceName", style: "simple", explode: false)))/refresh"), body: nil, responseType: CacheInstancesRefreshCreateResult.self)
    }

    /// Delete a runtime cache namespace
    public func cacheNamespacesDelete(namespace: String) async throws -> CacheNamespacesDeleteResult? {
        return try await client.delete(ApiPaths.backendPath("/system/cache/namespaces/\(serializePathParameter(namespace, PathParameterSpec(name: "namespace", style: "simple", explode: false)))"), responseType: CacheNamespacesDeleteResult.self)
    }

    /// List runtime cache keys in a namespace
    public func cacheNamespacesKeysList(namespace: String, limit: String? = nil, cursor: String? = nil) async throws -> CacheNamespacesKeysListResult? {
        let query = buildQueryString([
            QueryParameterSpec(name: "limit", value: limit, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "cursor", value: cursor, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/system/cache/namespaces/\(serializePathParameter(namespace, PathParameterSpec(name: "namespace", style: "simple", explode: false)))/keys"), query), responseType: CacheNamespacesKeysListResult.self)
    }

    /// Delete a runtime cache key
    public func cacheNamespacesKeysDelete(namespace: String, key: String) async throws -> CacheNamespacesKeysDeleteResult? {
        return try await client.delete(ApiPaths.backendPath("/system/cache/namespaces/\(serializePathParameter(namespace, PathParameterSpec(name: "namespace", style: "simple", explode: false)))/keys/\(serializePathParameter(key, PathParameterSpec(name: "key", style: "simple", explode: false)))"), responseType: CacheNamespacesKeysDeleteResult.self)
    }

    /// Refresh one runtime cache namespace
    public func cacheNamespacesRefreshCreate(namespace: String) async throws -> CacheNamespacesRefreshCreateResult? {
        return try await client.post(ApiPaths.backendPath("/system/cache/namespaces/\(serializePathParameter(namespace, PathParameterSpec(name: "namespace", style: "simple", explode: false)))/refresh"), body: nil, responseType: CacheNamespacesRefreshCreateResult.self)
    }

    /// Retrieve runtime cache overview
    public func cacheOverviewRetrieve() async throws -> CacheOverviewRetrieveResult? {
        return try await client.get(ApiPaths.backendPath("/system/cache/overview"), responseType: CacheOverviewRetrieveResult.self)
    }

    /// Refresh all runtime cache instances
    public func cacheRefreshCreate() async throws -> CacheRefreshCreateResult? {
        return try await client.post(ApiPaths.backendPath("/system/cache/refresh"), body: nil, responseType: CacheRefreshCreateResult.self)
    }

    /// List dashboard data
    public func dashboardAdminOverviewRetrieve() async throws -> DashboardAdminOverviewRetrieveResult? {
        return try await client.get(ApiPaths.backendPath("/system/dashboard/admin/overview"), responseType: DashboardAdminOverviewRetrieveResult.self)
    }

    /// List firewalls
    public func firewallsRulesList() async throws -> FirewallsRulesListResult? {
        return try await client.get(ApiPaths.backendPath("/system/firewalls/rules"), responseType: FirewallsRulesListResult.self)
    }

    /// Create firewall
    public func firewallsRulesCreate(body: AdminFirewallRuleCreateRequest) async throws -> FirewallsRulesCreateResult? {
        return try await client.post(ApiPaths.backendPath("/system/firewalls/rules"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: FirewallsRulesCreateResult.self)
    }

    /// Delete firewall
    public func firewallsRulesDelete(ruleId: String) async throws -> FirewallsRulesDeleteResult? {
        return try await client.delete(ApiPaths.backendPath("/system/firewalls/rules/\(serializePathParameter(ruleId, PathParameterSpec(name: "ruleId", style: "simple", explode: false)))"), responseType: FirewallsRulesDeleteResult.self)
    }

    /// List installation status
    public func installationStatusRetrieve() async throws -> InstallationStatusRetrieveResult? {
        return try await client.get(ApiPaths.backendPath("/system/installation/status"), responseType: InstallationStatusRetrieveResult.self)
    }

    /// List referral stats
    public func marketingReferralStatsList() async throws -> MarketingReferralStatsListResult? {
        return try await client.get(ApiPaths.backendPath("/system/marketing/referral_stats"), responseType: MarketingReferralStatsListResult.self)
    }

    /// List alerts
    public func monitorAlertsList() async throws -> MonitorAlertsListResult? {
        return try await client.get(ApiPaths.backendPath("/system/monitor/alerts"), responseType: MonitorAlertsListResult.self)
    }

    /// List nodes
    public func monitorNodesList() async throws -> MonitorNodesListResult? {
        return try await client.get(ApiPaths.backendPath("/system/monitor/nodes"), responseType: MonitorNodesListResult.self)
    }

    /// List performance data
    public func monitorPerformanceList() async throws -> MonitorPerformanceListResult? {
        return try await client.get(ApiPaths.backendPath("/system/monitor/performance"), responseType: MonitorPerformanceListResult.self)
    }

    /// List token limits
    public func rateLimitsApiKeysList() async throws -> RateLimitsApiKeysListResult? {
        return try await client.get(ApiPaths.backendPath("/system/rate_limits/api_keys"), responseType: RateLimitsApiKeysListResult.self)
    }

    /// Create token limit
    public func rateLimitsApiKeysCreate(body: AdminTokenLimitCreateRequest) async throws -> RateLimitsApiKeysCreateResult? {
        return try await client.post(ApiPaths.backendPath("/system/rate_limits/api_keys"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: RateLimitsApiKeysCreateResult.self)
    }

    /// List IP limits
    public func rateLimitsIpList() async throws -> RateLimitsIpListResult? {
        return try await client.get(ApiPaths.backendPath("/system/rate_limits/ip"), responseType: RateLimitsIpListResult.self)
    }

    /// Create IP limit
    public func rateLimitsIpCreate(body: AdminIpLimitCreateRequest) async throws -> RateLimitsIpCreateResult? {
        return try await client.post(ApiPaths.backendPath("/system/rate_limits/ip"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: RateLimitsIpCreateResult.self)
    }

    /// List model limits
    public func rateLimitsModelsList() async throws -> RateLimitsModelsListResult? {
        return try await client.get(ApiPaths.backendPath("/system/rate_limits/models"), responseType: RateLimitsModelsListResult.self)
    }

    /// Create model limit
    public func rateLimitsModelsCreate(body: AdminModelLimitCreateRequest) async throws -> RateLimitsModelsCreateResult? {
        return try await client.post(ApiPaths.backendPath("/system/rate_limits/models"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: RateLimitsModelsCreateResult.self)
    }

    /// List logs
    public func recordsList(page: String? = nil, pageSize: String? = nil, user: String? = nil, token: String? = nil, model: String? = nil) async throws -> RecordsListResult? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: pageSize, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "user", value: user, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "token", value: token, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "model", value: model, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/system/records"), query), responseType: RecordsListResult.self)
    }

    /// Retrieve runtime region settings
    public func runtimeRegionSettingsRetrieve() async throws -> RuntimeRegionSettingsRetrieveResult? {
        return try await client.get(ApiPaths.backendPath("/system/runtime_region/settings"), responseType: RuntimeRegionSettingsRetrieveResult.self)
    }

    /// Update runtime region settings
    public func runtimeRegionSettingsUpdate(body: AdminRuntimeRegionSettingsUpdateRequest) async throws -> RuntimeRegionSettingsUpdateResult? {
        return try await client.patch(ApiPaths.backendPath("/system/runtime_region/settings"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: RuntimeRegionSettingsUpdateResult.self)
    }

    /// List service nodes
    public func serviceNodesList(q: String? = nil, status: String? = nil) async throws -> ServiceNodesListResult? {
        let query = buildQueryString([
            QueryParameterSpec(name: "q", value: q, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "status", value: status, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/system/service_nodes"), query), responseType: ServiceNodesListResult.self)
    }

    /// Create service node
    public func serviceNodesCreate(body: AdminServiceNodeCreateRequest) async throws -> ServiceNodesCreateResult? {
        return try await client.post(ApiPaths.backendPath("/system/service_nodes"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: ServiceNodesCreateResult.self)
    }

    /// Delete service node
    public func serviceNodesDelete(nodeId: String) async throws -> ServiceNodesDeleteResult? {
        return try await client.delete(ApiPaths.backendPath("/system/service_nodes/\(serializePathParameter(nodeId, PathParameterSpec(name: "nodeId", style: "simple", explode: false)))"), responseType: ServiceNodesDeleteResult.self)
    }

    /// Update service node
    public func serviceNodesUpdate(nodeId: String, body: AdminServiceNodeUpdateRequest) async throws -> ServiceNodesUpdateResult? {
        return try await client.put(ApiPaths.backendPath("/system/service_nodes/\(serializePathParameter(nodeId, PathParameterSpec(name: "nodeId", style: "simple", explode: false)))"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: ServiceNodesUpdateResult.self)
    }

    /// Update service node status
    public func serviceNodesStatusUpdate(nodeId: String, body: AdminServiceNodeStatusUpdateRequest) async throws -> ServiceNodesStatusUpdateResult? {
        return try await client.put(ApiPaths.backendPath("/system/service_nodes/\(serializePathParameter(nodeId, PathParameterSpec(name: "nodeId", style: "simple", explode: false)))/status"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: ServiceNodesStatusUpdateResult.self)
    }

    /// Retrieve site branding and deployment personalization settings
    public func siteSettingsRetrieve() async throws -> SiteSettingsRetrieveResult? {
        return try await client.get(ApiPaths.backendPath("/system/site/settings"), responseType: SiteSettingsRetrieveResult.self)
    }

    /// Update site branding and deployment personalization settings
    public func siteSettingsUpdate(body: AdminSiteSettingsUpdateRequest) async throws -> SiteSettingsUpdateResult? {
        return try await client.patch(ApiPaths.backendPath("/system/site/settings"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: SiteSettingsUpdateResult.self)
    }

    private struct PathParameterSpec {
        let name: String
        let style: String
        let explode: Bool
    }

    private func serializePathParameter(_ value: Any?, _ spec: PathParameterSpec) -> String {
        guard let value else { return "" }
        let style = spec.style.isEmpty ? "simple" : spec.style
        if let array = value as? [Any] {
            return serializePathArray(spec.name, array, style, spec.explode)
        }
        if let object = value as? [String: Any] {
            return serializePathObject(spec.name, object, style, spec.explode)
        }
        return pathPrimitivePrefix(spec.name, style) + pathEncode(String(describing: value))
    }

    private func serializePathArray(_ name: String, _ values: [Any], _ style: String, _ explode: Bool) -> String {
        let serialized = values.map { pathEncode(String(describing: $0)) }
        if serialized.isEmpty { return pathPrefix(name, style) }
        if style == "matrix" {
            if explode {
                return serialized.map { ";\(name)=\($0)" }.joined()
            }
            return ";\(name)=" + serialized.joined(separator: ",")
        }
        let separator = explode ? "." : ","
        return pathPrefix(name, style) + serialized.joined(separator: separator)
    }

    private func serializePathObject(_ name: String, _ values: [String: Any], _ style: String, _ explode: Bool) -> String {
        var entries: [String] = []
        var exploded: [String] = []
        for (key, value) in values {
            let escapedKey = pathEncode(key)
            let escapedValue = pathEncode(String(describing: value))
            if explode {
                if style == "matrix" {
                    exploded.append(";\(escapedKey)=\(escapedValue)")
                } else {
                    exploded.append("\(escapedKey)=\(escapedValue)")
                }
            } else {
                entries.append(escapedKey)
                entries.append(escapedValue)
            }
        }
        if style == "matrix" {
            if explode {
                return exploded.joined()
            }
            return ";\(name)=" + entries.joined(separator: ",")
        }
        if explode {
            let separator = style == "label" ? "." : ","
            return pathPrefix(name, style) + exploded.joined(separator: separator)
        }
        return pathPrefix(name, style) + entries.joined(separator: ",")
    }

    private func pathPrefix(_ name: String, _ style: String) -> String {
        if style == "label" { return "." }
        if style == "matrix" { return ";\(name)" }
        return ""
    }

    private func pathPrimitivePrefix(_ name: String, _ style: String) -> String {
        style == "matrix" ? ";\(name)=" : pathPrefix(name, style)
    }

    private func pathEncode(_ value: String) -> String {
        value.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? value
    }

    private struct QueryParameterSpec {
        let name: String
        let value: Any?
        let style: String
        let explode: Bool
        let allowReserved: Bool
        let contentType: String?
    }

    private func buildQueryString(_ parameters: [QueryParameterSpec]) -> String {
        var pairs: [String] = []
        for parameter in parameters {
            appendSerializedParameter(&pairs, parameter)
        }
        return pairs.joined(separator: "&")
    }

    private func appendSerializedParameter(_ pairs: inout [String], _ parameter: QueryParameterSpec) {
        guard let value = parameter.value else { return }
        if let contentType = parameter.contentType, !contentType.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            let data = (try? JSONSerialization.data(withJSONObject: value, options: [])) ?? Data(String(describing: value).utf8)
            let json = String(data: data, encoding: .utf8) ?? String(describing: value)
            pairs.append("\(urlEncode(parameter.name))=\(encodeQueryValue(json, allowReserved: parameter.allowReserved))")
            return
        }

        let style = parameter.style.isEmpty ? "form" : parameter.style
        if style == "deepObject", let object = value as? [String: Any] {
            appendDeepObjectParameter(&pairs, name: parameter.name, values: object, allowReserved: parameter.allowReserved)
        } else if let array = value as? [Any] {
            appendArrayParameter(&pairs, name: parameter.name, values: array, style: style, explode: parameter.explode, allowReserved: parameter.allowReserved)
        } else if let object = value as? [String: Any] {
            appendObjectParameter(&pairs, name: parameter.name, values: object, style: style, explode: parameter.explode, allowReserved: parameter.allowReserved)
        } else {
            pairs.append("\(urlEncode(parameter.name))=\(encodeQueryValue(String(describing: value), allowReserved: parameter.allowReserved))")
        }
    }

    private func appendArrayParameter(
        _ pairs: inout [String],
        name: String,
        values: [Any],
        style: String,
        explode: Bool,
        allowReserved: Bool
    ) {
        let serialized = values.map { String(describing: $0) }
        guard !serialized.isEmpty else { return }
        if style == "form" && explode {
            for item in serialized {
                pairs.append("\(urlEncode(name))=\(encodeQueryValue(item, allowReserved: allowReserved))")
            }
            return
        }
        pairs.append("\(urlEncode(name))=\(encodeQueryValue(serialized.joined(separator: ","), allowReserved: allowReserved))")
    }

    private func appendObjectParameter(
        _ pairs: inout [String],
        name: String,
        values: [String: Any],
        style: String,
        explode: Bool,
        allowReserved: Bool
    ) {
        var serialized: [String] = []
        for (key, value) in values {
            if style == "form" && explode {
                pairs.append("\(urlEncode(key))=\(encodeQueryValue(String(describing: value), allowReserved: allowReserved))")
            } else {
                serialized.append(key)
                serialized.append(String(describing: value))
            }
        }
        if !serialized.isEmpty {
            pairs.append("\(urlEncode(name))=\(encodeQueryValue(serialized.joined(separator: ","), allowReserved: allowReserved))")
        }
    }

    private func appendDeepObjectParameter(_ pairs: inout [String], name: String, values: [String: Any], allowReserved: Bool) {
        for (key, value) in values {
            pairs.append("\(urlEncode("\(name)[\(key)]"))=\(encodeQueryValue(String(describing: value), allowReserved: allowReserved))")
        }
    }

    private func encodeQueryValue(_ value: String, allowReserved: Bool) -> String {
        var encoded = urlEncode(value)
        if !allowReserved { return encoded }
        [
            "%3A": ":", "%2F": "/", "%3F": "?", "%23": "#",
            "%5B": "[", "%5D": "]", "%40": "@", "%21": "!",
            "%24": "$", "%26": "&", "%27": "'", "%28": "(",
            "%29": ")", "%2A": "*", "%2B": "+", "%2C": ",",
            "%3B": ";", "%3D": "=",
        ].forEach { encoded = encoded.replacingOccurrences(of: $0.key, with: $0.value) }
        return encoded
    }

    private func urlEncode(_ value: String) -> String {
        value.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? value
    }

}
