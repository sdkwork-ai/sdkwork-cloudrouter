import Foundation

public class SystemApi {
    private let client: HttpClient

    public init(client: HttpClient) {
        self.client = client
    }

    /// Create
    public func afterSalesReviewsCreate(afterSalesRequestId: String) async throws -> AfterSalesReviewsCreateResult? {
        return try await client.post(ApiPaths.backendPath("/system/after_sales/requests/\(serializePathParameter(afterSalesRequestId, PathParameterSpec(name: "afterSalesRequestId", style: "simple", explode: false)))/reviews"), body: nil, responseType: AfterSalesReviewsCreateResult.self)
    }

    /// Retrieve
    public func analyticsAdminOverviewRetrieve(timeRange: String? = nil, startTime: String? = nil, endTime: String? = nil, rankingSize: Int? = nil) async throws -> AnalyticsAdminOverviewRetrieveResult? {
        let query = buildQueryString([
            QueryParameterSpec(name: "time_range", value: timeRange, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "start_time", value: startTime, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "end_time", value: endTime, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "ranking_size", value: rankingSize, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/system/analytics/admin/overview"), query), responseType: AnalyticsAdminOverviewRetrieveResult.self)
    }

    /// Retrieve
    public func authSettingsRetrieve() async throws -> AuthSettingsRetrieveResult? {
        return try await client.get(ApiPaths.backendPath("/system/auth/settings"), responseType: AuthSettingsRetrieveResult.self)
    }

    /// Update
    public func authSettingsUpdate() async throws -> AuthSettingsUpdateResult? {
        return try await client.patch(ApiPaths.backendPath("/system/auth/settings"), body: nil, responseType: AuthSettingsUpdateResult.self)
    }

    /// Delete
    public func cacheInstancesDelete(instanceName: String) async throws -> CacheInstancesDeleteResult? {
        return try await client.delete(ApiPaths.backendPath("/system/cache/instances/\(serializePathParameter(instanceName, PathParameterSpec(name: "instanceName", style: "simple", explode: false)))"), responseType: CacheInstancesDeleteResult.self)
    }

    /// Create
    public func cacheInstancesRefreshCreate(instanceName: String) async throws -> CacheInstancesRefreshCreateResult? {
        return try await client.post(ApiPaths.backendPath("/system/cache/instances/\(serializePathParameter(instanceName, PathParameterSpec(name: "instanceName", style: "simple", explode: false)))/refresh"), body: nil, responseType: CacheInstancesRefreshCreateResult.self)
    }

    /// Delete
    public func cacheNamespacesDelete(namespace: String) async throws -> CacheNamespacesDeleteResult? {
        return try await client.delete(ApiPaths.backendPath("/system/cache/namespaces/\(serializePathParameter(namespace, PathParameterSpec(name: "namespace", style: "simple", explode: false)))"), responseType: CacheNamespacesDeleteResult.self)
    }

    /// List
    public func cacheNamespacesKeysList(namespace: String, pageSize: Int? = nil, cursor: String? = nil) async throws -> CacheNamespacesKeysListResult? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page_size", value: pageSize, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "cursor", value: cursor, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/system/cache/namespaces/\(serializePathParameter(namespace, PathParameterSpec(name: "namespace", style: "simple", explode: false)))/keys"), query), responseType: CacheNamespacesKeysListResult.self)
    }

    /// Delete
    public func cacheNamespacesKeysDelete(namespace: String, key: String) async throws -> CacheNamespacesKeysDeleteResult? {
        return try await client.delete(ApiPaths.backendPath("/system/cache/namespaces/\(serializePathParameter(namespace, PathParameterSpec(name: "namespace", style: "simple", explode: false)))/keys/\(serializePathParameter(key, PathParameterSpec(name: "key", style: "simple", explode: false)))"), responseType: CacheNamespacesKeysDeleteResult.self)
    }

    /// Create
    public func cacheNamespacesRefreshCreate(namespace: String) async throws -> CacheNamespacesRefreshCreateResult? {
        return try await client.post(ApiPaths.backendPath("/system/cache/namespaces/\(serializePathParameter(namespace, PathParameterSpec(name: "namespace", style: "simple", explode: false)))/refresh"), body: nil, responseType: CacheNamespacesRefreshCreateResult.self)
    }

    /// Retrieve
    public func cacheOverviewRetrieve() async throws -> CacheOverviewRetrieveResult? {
        return try await client.get(ApiPaths.backendPath("/system/cache/overview"), responseType: CacheOverviewRetrieveResult.self)
    }

    /// Create
    public func cacheRefreshCreate() async throws -> CacheRefreshCreateResult? {
        return try await client.post(ApiPaths.backendPath("/system/cache/refresh"), body: nil, responseType: CacheRefreshCreateResult.self)
    }

    /// Retrieve
    public func dashboardAdminOverviewRetrieve() async throws -> DashboardAdminOverviewRetrieveResult? {
        return try await client.get(ApiPaths.backendPath("/system/dashboard/admin/overview"), responseType: DashboardAdminOverviewRetrieveResult.self)
    }

    /// List
    public func firewallsRulesList() async throws -> FirewallsRulesListResult? {
        return try await client.get(ApiPaths.backendPath("/system/firewalls/rules"), responseType: FirewallsRulesListResult.self)
    }

    /// Create
    public func firewallsRulesCreate() async throws -> FirewallsRulesCreateResult? {
        return try await client.post(ApiPaths.backendPath("/system/firewalls/rules"), body: nil, responseType: FirewallsRulesCreateResult.self)
    }

    /// Delete
    public func firewallsRulesDelete(ruleId: String) async throws -> FirewallsRulesDeleteResult? {
        return try await client.delete(ApiPaths.backendPath("/system/firewalls/rules/\(serializePathParameter(ruleId, PathParameterSpec(name: "ruleId", style: "simple", explode: false)))"), responseType: FirewallsRulesDeleteResult.self)
    }

    /// Retrieve
    public func installationStatusRetrieve() async throws -> InstallationStatusRetrieveResult? {
        return try await client.get(ApiPaths.backendPath("/system/installation/status"), responseType: InstallationStatusRetrieveResult.self)
    }

    /// List
    public func marketingReferralStatsList() async throws -> MarketingReferralStatsListResult? {
        return try await client.get(ApiPaths.backendPath("/system/marketing/referral_stats"), responseType: MarketingReferralStatsListResult.self)
    }

    /// List
    public func monitorAlertsList() async throws -> MonitorAlertsListResult? {
        return try await client.get(ApiPaths.backendPath("/system/monitor/alerts"), responseType: MonitorAlertsListResult.self)
    }

    /// List
    public func monitorNodesList() async throws -> MonitorNodesListResult? {
        return try await client.get(ApiPaths.backendPath("/system/monitor/nodes"), responseType: MonitorNodesListResult.self)
    }

    /// List
    public func monitorPerformanceList() async throws -> MonitorPerformanceListResult? {
        return try await client.get(ApiPaths.backendPath("/system/monitor/performance"), responseType: MonitorPerformanceListResult.self)
    }

    /// List
    public func rateLimitsApiKeysList() async throws -> RateLimitsApiKeysListResult? {
        return try await client.get(ApiPaths.backendPath("/system/rate_limits/api_keys"), responseType: RateLimitsApiKeysListResult.self)
    }

    /// Create
    public func rateLimitsApiKeysCreate() async throws -> RateLimitsApiKeysCreateResult? {
        return try await client.post(ApiPaths.backendPath("/system/rate_limits/api_keys"), body: nil, responseType: RateLimitsApiKeysCreateResult.self)
    }

    /// List
    public func rateLimitsIpList() async throws -> RateLimitsIpListResult? {
        return try await client.get(ApiPaths.backendPath("/system/rate_limits/ip"), responseType: RateLimitsIpListResult.self)
    }

    /// Create
    public func rateLimitsIpCreate() async throws -> RateLimitsIpCreateResult? {
        return try await client.post(ApiPaths.backendPath("/system/rate_limits/ip"), body: nil, responseType: RateLimitsIpCreateResult.self)
    }

    /// List
    public func rateLimitsModelsList() async throws -> RateLimitsModelsListResult? {
        return try await client.get(ApiPaths.backendPath("/system/rate_limits/models"), responseType: RateLimitsModelsListResult.self)
    }

    /// Create
    public func rateLimitsModelsCreate() async throws -> RateLimitsModelsCreateResult? {
        return try await client.post(ApiPaths.backendPath("/system/rate_limits/models"), body: nil, responseType: RateLimitsModelsCreateResult.self)
    }

    /// List
    public func recordsList() async throws -> RecordsListResult? {
        return try await client.get(ApiPaths.backendPath("/system/records"), responseType: RecordsListResult.self)
    }

    /// Retrieve
    public func runtimeRegionSettingsRetrieve() async throws -> RuntimeRegionSettingsRetrieveResult? {
        return try await client.get(ApiPaths.backendPath("/system/runtime_region/settings"), responseType: RuntimeRegionSettingsRetrieveResult.self)
    }

    /// Update
    public func runtimeRegionSettingsUpdate() async throws -> RuntimeRegionSettingsUpdateResult? {
        return try await client.patch(ApiPaths.backendPath("/system/runtime_region/settings"), body: nil, responseType: RuntimeRegionSettingsUpdateResult.self)
    }

    /// List
    public func serviceNodesList() async throws -> ServiceNodesListResult? {
        return try await client.get(ApiPaths.backendPath("/system/service_nodes"), responseType: ServiceNodesListResult.self)
    }

    /// Create
    public func serviceNodesCreate() async throws -> ServiceNodesCreateResult? {
        return try await client.post(ApiPaths.backendPath("/system/service_nodes"), body: nil, responseType: ServiceNodesCreateResult.self)
    }

    /// Delete
    public func serviceNodesDelete(nodeId: String) async throws -> ServiceNodesDeleteResult? {
        return try await client.delete(ApiPaths.backendPath("/system/service_nodes/\(serializePathParameter(nodeId, PathParameterSpec(name: "nodeId", style: "simple", explode: false)))"), responseType: ServiceNodesDeleteResult.self)
    }

    /// Update
    public func serviceNodesUpdate(nodeId: String) async throws -> ServiceNodesUpdateResult? {
        return try await client.put(ApiPaths.backendPath("/system/service_nodes/\(serializePathParameter(nodeId, PathParameterSpec(name: "nodeId", style: "simple", explode: false)))"), body: nil, responseType: ServiceNodesUpdateResult.self)
    }

    /// Update
    public func serviceNodesStatusUpdate(nodeId: String) async throws -> ServiceNodesStatusUpdateResult? {
        return try await client.put(ApiPaths.backendPath("/system/service_nodes/\(serializePathParameter(nodeId, PathParameterSpec(name: "nodeId", style: "simple", explode: false)))/status"), body: nil, responseType: ServiceNodesStatusUpdateResult.self)
    }

    /// Create
    public func shopsCreate() async throws -> ShopsCreateResult? {
        return try await client.post(ApiPaths.backendPath("/system/shops"), body: nil, responseType: ShopsCreateResult.self)
    }

    /// Update
    public func shopsUpdate(shopId: String) async throws -> ShopsUpdateResult? {
        return try await client.patch(ApiPaths.backendPath("/system/shops/\(serializePathParameter(shopId, PathParameterSpec(name: "shopId", style: "simple", explode: false)))"), body: nil, responseType: ShopsUpdateResult.self)
    }

    /// Approve
    public func shopsApprove(shopId: String) async throws -> ShopsApproveResult? {
        return try await client.post(ApiPaths.backendPath("/system/shops/\(serializePathParameter(shopId, PathParameterSpec(name: "shopId", style: "simple", explode: false)))/approve"), body: nil, responseType: ShopsApproveResult.self)
    }

    /// Upsert
    public func shopsBrandAuthorizationsUpsert(shopId: String) async throws -> ShopsBrandAuthorizationsUpsertResult? {
        return try await client.put(ApiPaths.backendPath("/system/shops/\(serializePathParameter(shopId, PathParameterSpec(name: "shopId", style: "simple", explode: false)))/brand_authorizations"), body: nil, responseType: ShopsBrandAuthorizationsUpsertResult.self)
    }

    /// Update
    public func shopsBusinessHoursUpdate(shopId: String) async throws -> ShopsBusinessHoursUpdateResult? {
        return try await client.patch(ApiPaths.backendPath("/system/shops/\(serializePathParameter(shopId, PathParameterSpec(name: "shopId", style: "simple", explode: false)))/business_hours"), body: nil, responseType: ShopsBusinessHoursUpdateResult.self)
    }

    /// Upsert
    public func shopsCategoryBindingsUpsert(shopId: String) async throws -> ShopsCategoryBindingsUpsertResult? {
        return try await client.put(ApiPaths.backendPath("/system/shops/\(serializePathParameter(shopId, PathParameterSpec(name: "shopId", style: "simple", explode: false)))/category_bindings"), body: nil, responseType: ShopsCategoryBindingsUpsertResult.self)
    }

    /// Create
    public func shopsChannelsCreate(shopId: String) async throws -> ShopsChannelsCreateResult? {
        return try await client.post(ApiPaths.backendPath("/system/shops/\(serializePathParameter(shopId, PathParameterSpec(name: "shopId", style: "simple", explode: false)))/channels"), body: nil, responseType: ShopsChannelsCreateResult.self)
    }

    /// Update
    public func shopsChannelsUpdate(shopId: String, channelId: String) async throws -> ShopsChannelsUpdateResult? {
        return try await client.patch(ApiPaths.backendPath("/system/shops/\(serializePathParameter(shopId, PathParameterSpec(name: "shopId", style: "simple", explode: false)))/channels/\(serializePathParameter(channelId, PathParameterSpec(name: "channelId", style: "simple", explode: false)))"), body: nil, responseType: ShopsChannelsUpdateResult.self)
    }

    /// Close
    public func shopsClose(shopId: String) async throws -> ShopsCloseResult? {
        return try await client.post(ApiPaths.backendPath("/system/shops/\(serializePathParameter(shopId, PathParameterSpec(name: "shopId", style: "simple", explode: false)))/close"), body: nil, responseType: ShopsCloseResult.self)
    }

    /// Upsert
    public func shopsCustomerServicesUpsert(shopId: String) async throws -> ShopsCustomerServicesUpsertResult? {
        return try await client.put(ApiPaths.backendPath("/system/shops/\(serializePathParameter(shopId, PathParameterSpec(name: "shopId", style: "simple", explode: false)))/customer_services"), body: nil, responseType: ShopsCustomerServicesUpsertResult.self)
    }

    /// Update
    public func shopsDepositAccountUpdate(shopId: String) async throws -> ShopsDepositAccountUpdateResult? {
        return try await client.patch(ApiPaths.backendPath("/system/shops/\(serializePathParameter(shopId, PathParameterSpec(name: "shopId", style: "simple", explode: false)))/deposit_account"), body: nil, responseType: ShopsDepositAccountUpdateResult.self)
    }

    /// Review
    public func shopsDepositAccountReview(shopId: String) async throws -> ShopsDepositAccountReviewResult? {
        return try await client.post(ApiPaths.backendPath("/system/shops/\(serializePathParameter(shopId, PathParameterSpec(name: "shopId", style: "simple", explode: false)))/deposit_account/review"), body: nil, responseType: ShopsDepositAccountReviewResult.self)
    }

    /// Update
    public func shopsFulfillmentProfileUpdate(shopId: String) async throws -> ShopsFulfillmentProfileUpdateResult? {
        return try await client.patch(ApiPaths.backendPath("/system/shops/\(serializePathParameter(shopId, PathParameterSpec(name: "shopId", style: "simple", explode: false)))/fulfillment_profile"), body: nil, responseType: ShopsFulfillmentProfileUpdateResult.self)
    }

    /// Create
    public func shopsPoliciesCreate(shopId: String) async throws -> ShopsPoliciesCreateResult? {
        return try await client.post(ApiPaths.backendPath("/system/shops/\(serializePathParameter(shopId, PathParameterSpec(name: "shopId", style: "simple", explode: false)))/policies"), body: nil, responseType: ShopsPoliciesCreateResult.self)
    }

    /// Update
    public func shopsPoliciesUpdate(shopId: String, policyId: String) async throws -> ShopsPoliciesUpdateResult? {
        return try await client.patch(ApiPaths.backendPath("/system/shops/\(serializePathParameter(shopId, PathParameterSpec(name: "shopId", style: "simple", explode: false)))/policies/\(serializePathParameter(policyId, PathParameterSpec(name: "policyId", style: "simple", explode: false)))"), body: nil, responseType: ShopsPoliciesUpdateResult.self)
    }

    /// Upsert
    public func shopsQualificationsUpsert(shopId: String) async throws -> ShopsQualificationsUpsertResult? {
        return try await client.put(ApiPaths.backendPath("/system/shops/\(serializePathParameter(shopId, PathParameterSpec(name: "shopId", style: "simple", explode: false)))/qualifications"), body: nil, responseType: ShopsQualificationsUpsertResult.self)
    }

    /// Reject
    public func shopsReject(shopId: String) async throws -> ShopsRejectResult? {
        return try await client.post(ApiPaths.backendPath("/system/shops/\(serializePathParameter(shopId, PathParameterSpec(name: "shopId", style: "simple", explode: false)))/reject"), body: nil, responseType: ShopsRejectResult.self)
    }

    /// Resume
    public func shopsResume(shopId: String) async throws -> ShopsResumeResult? {
        return try await client.post(ApiPaths.backendPath("/system/shops/\(serializePathParameter(shopId, PathParameterSpec(name: "shopId", style: "simple", explode: false)))/resume"), body: nil, responseType: ShopsResumeResult.self)
    }

    /// Upsert
    public func shopsReturnAddressesUpsert(shopId: String) async throws -> ShopsReturnAddressesUpsertResult? {
        return try await client.put(ApiPaths.backendPath("/system/shops/\(serializePathParameter(shopId, PathParameterSpec(name: "shopId", style: "simple", explode: false)))/return_addresses"), body: nil, responseType: ShopsReturnAddressesUpsertResult.self)
    }

    /// Create
    public func shopsRiskSignalsCreate(shopId: String) async throws -> ShopsRiskSignalsCreateResult? {
        return try await client.post(ApiPaths.backendPath("/system/shops/\(serializePathParameter(shopId, PathParameterSpec(name: "shopId", style: "simple", explode: false)))/risk_signals"), body: nil, responseType: ShopsRiskSignalsCreateResult.self)
    }

    /// Resolve
    public func shopsRiskSignalsResolve(shopId: String, riskSignalId: String) async throws -> ShopsRiskSignalsResolveResult? {
        return try await client.post(ApiPaths.backendPath("/system/shops/\(serializePathParameter(shopId, PathParameterSpec(name: "shopId", style: "simple", explode: false)))/risk_signals/\(serializePathParameter(riskSignalId, PathParameterSpec(name: "riskSignalId", style: "simple", explode: false)))/resolve"), body: nil, responseType: ShopsRiskSignalsResolveResult.self)
    }

    /// Create
    public func shopsServiceAreasCreate(shopId: String) async throws -> ShopsServiceAreasCreateResult? {
        return try await client.post(ApiPaths.backendPath("/system/shops/\(serializePathParameter(shopId, PathParameterSpec(name: "shopId", style: "simple", explode: false)))/service_areas"), body: nil, responseType: ShopsServiceAreasCreateResult.self)
    }

    /// Update
    public func shopsServiceAreasUpdate(shopId: String, serviceAreaId: String) async throws -> ShopsServiceAreasUpdateResult? {
        return try await client.patch(ApiPaths.backendPath("/system/shops/\(serializePathParameter(shopId, PathParameterSpec(name: "shopId", style: "simple", explode: false)))/service_areas/\(serializePathParameter(serviceAreaId, PathParameterSpec(name: "serviceAreaId", style: "simple", explode: false)))"), body: nil, responseType: ShopsServiceAreasUpdateResult.self)
    }

    /// Update
    public func shopsSettlementProfileUpdate(shopId: String) async throws -> ShopsSettlementProfileUpdateResult? {
        return try await client.patch(ApiPaths.backendPath("/system/shops/\(serializePathParameter(shopId, PathParameterSpec(name: "shopId", style: "simple", explode: false)))/settlement_profile"), body: nil, responseType: ShopsSettlementProfileUpdateResult.self)
    }

    /// Approve
    public func shopsSettlementProfileApprove(shopId: String) async throws -> ShopsSettlementProfileApproveResult? {
        return try await client.post(ApiPaths.backendPath("/system/shops/\(serializePathParameter(shopId, PathParameterSpec(name: "shopId", style: "simple", explode: false)))/settlement_profile/approve"), body: nil, responseType: ShopsSettlementProfileApproveResult.self)
    }

    /// Reject
    public func shopsSettlementProfileReject(shopId: String) async throws -> ShopsSettlementProfileRejectResult? {
        return try await client.post(ApiPaths.backendPath("/system/shops/\(serializePathParameter(shopId, PathParameterSpec(name: "shopId", style: "simple", explode: false)))/settlement_profile/reject"), body: nil, responseType: ShopsSettlementProfileRejectResult.self)
    }

    /// Upsert
    public func shopsShippingTemplatesUpsert(shopId: String) async throws -> ShopsShippingTemplatesUpsertResult? {
        return try await client.put(ApiPaths.backendPath("/system/shops/\(serializePathParameter(shopId, PathParameterSpec(name: "shopId", style: "simple", explode: false)))/shipping_templates"), body: nil, responseType: ShopsShippingTemplatesUpsertResult.self)
    }

    /// Create review
    public func shopsSubmitReview(shopId: String) async throws -> ShopsSubmitReviewResult? {
        return try await client.post(ApiPaths.backendPath("/system/shops/\(serializePathParameter(shopId, PathParameterSpec(name: "shopId", style: "simple", explode: false)))/submit_review"), body: nil, responseType: ShopsSubmitReviewResult.self)
    }

    /// Suspend
    public func shopsSuspend(shopId: String) async throws -> ShopsSuspendResult? {
        return try await client.post(ApiPaths.backendPath("/system/shops/\(serializePathParameter(shopId, PathParameterSpec(name: "shopId", style: "simple", explode: false)))/suspend"), body: nil, responseType: ShopsSuspendResult.self)
    }

    /// Update
    public func shopsVerificationsUpdate(shopId: String, verificationId: String) async throws -> ShopsVerificationsUpdateResult? {
        return try await client.patch(ApiPaths.backendPath("/system/shops/\(serializePathParameter(shopId, PathParameterSpec(name: "shopId", style: "simple", explode: false)))/verifications/\(serializePathParameter(verificationId, PathParameterSpec(name: "verificationId", style: "simple", explode: false)))"), body: nil, responseType: ShopsVerificationsUpdateResult.self)
    }

    /// Retrieve
    public func siteSettingsRetrieve() async throws -> SiteSettingsRetrieveResult? {
        return try await client.get(ApiPaths.backendPath("/system/site/settings"), responseType: SiteSettingsRetrieveResult.self)
    }

    /// Update
    public func siteSettingsUpdate() async throws -> SiteSettingsUpdateResult? {
        return try await client.patch(ApiPaths.backendPath("/system/site/settings"), body: nil, responseType: SiteSettingsUpdateResult.self)
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
