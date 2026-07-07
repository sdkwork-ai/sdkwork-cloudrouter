package com.sdkwork.clawrouter.backend.api

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import com.sdkwork.clawrouter.backend.*
import com.sdkwork.clawrouter.backend.http.HttpClient

class SystemApi(private val client: HttpClient) {

    /** Create */
    suspend fun afterSalesReviewsCreate(afterSalesRequestId: String): AfterSalesReviewsCreateResult? {
        val raw = client.post(ApiPaths.backendPath("/system/after_sales/requests/${serializePathParameter(afterSalesRequestId, PathParameterSpec("afterSalesRequestId", "simple", false))}/reviews"), null)
        return client.convertValue(raw, object : TypeReference<AfterSalesReviewsCreateResult>() {})
    }

    /** Retrieve */
    suspend fun analyticsAdminOverviewRetrieve(timeRange: String? = null, startTime: String? = null, endTime: String? = null, rankingSize: Int? = null): AnalyticsAdminOverviewRetrieveResult? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("time_range", timeRange, "form", true, false, null),
            QueryParameterSpec("start_time", startTime, "form", true, false, null),
            QueryParameterSpec("end_time", endTime, "form", true, false, null),
            QueryParameterSpec("ranking_size", rankingSize, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/system/analytics/admin/overview"), query))
        return client.convertValue(raw, object : TypeReference<AnalyticsAdminOverviewRetrieveResult>() {})
    }

    /** Retrieve */
    suspend fun authSettingsRetrieve(): AuthSettingsRetrieveResult? {
        val raw = client.get(ApiPaths.backendPath("/system/auth/settings"))
        return client.convertValue(raw, object : TypeReference<AuthSettingsRetrieveResult>() {})
    }

    /** Update */
    suspend fun authSettingsUpdate(): AuthSettingsUpdateResult? {
        val raw = client.patch(ApiPaths.backendPath("/system/auth/settings"), null)
        return client.convertValue(raw, object : TypeReference<AuthSettingsUpdateResult>() {})
    }

    /** Delete */
    suspend fun cacheInstancesDelete(instanceName: String): CacheInstancesDeleteResult? {
        val raw = client.delete(ApiPaths.backendPath("/system/cache/instances/${serializePathParameter(instanceName, PathParameterSpec("instanceName", "simple", false))}"))
        return client.convertValue(raw, object : TypeReference<CacheInstancesDeleteResult>() {})
    }

    /** Create */
    suspend fun cacheInstancesRefreshCreate(instanceName: String): CacheInstancesRefreshCreateResult? {
        val raw = client.post(ApiPaths.backendPath("/system/cache/instances/${serializePathParameter(instanceName, PathParameterSpec("instanceName", "simple", false))}/refresh"), null)
        return client.convertValue(raw, object : TypeReference<CacheInstancesRefreshCreateResult>() {})
    }

    /** Delete */
    suspend fun cacheNamespacesDelete(namespace: String): CacheNamespacesDeleteResult? {
        val raw = client.delete(ApiPaths.backendPath("/system/cache/namespaces/${serializePathParameter(namespace, PathParameterSpec("namespace", "simple", false))}"))
        return client.convertValue(raw, object : TypeReference<CacheNamespacesDeleteResult>() {})
    }

    /** List */
    suspend fun cacheNamespacesKeysList(namespace: String, pageSize: Int? = null, cursor: String? = null): CacheNamespacesKeysListResult? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            QueryParameterSpec("cursor", cursor, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/system/cache/namespaces/${serializePathParameter(namespace, PathParameterSpec("namespace", "simple", false))}/keys"), query))
        return client.convertValue(raw, object : TypeReference<CacheNamespacesKeysListResult>() {})
    }

    /** Delete */
    suspend fun cacheNamespacesKeysDelete(namespace: String, key: String): CacheNamespacesKeysDeleteResult? {
        val raw = client.delete(ApiPaths.backendPath("/system/cache/namespaces/${serializePathParameter(namespace, PathParameterSpec("namespace", "simple", false))}/keys/${serializePathParameter(key, PathParameterSpec("key", "simple", false))}"))
        return client.convertValue(raw, object : TypeReference<CacheNamespacesKeysDeleteResult>() {})
    }

    /** Create */
    suspend fun cacheNamespacesRefreshCreate(namespace: String): CacheNamespacesRefreshCreateResult? {
        val raw = client.post(ApiPaths.backendPath("/system/cache/namespaces/${serializePathParameter(namespace, PathParameterSpec("namespace", "simple", false))}/refresh"), null)
        return client.convertValue(raw, object : TypeReference<CacheNamespacesRefreshCreateResult>() {})
    }

    /** Retrieve */
    suspend fun cacheOverviewRetrieve(): CacheOverviewRetrieveResult? {
        val raw = client.get(ApiPaths.backendPath("/system/cache/overview"))
        return client.convertValue(raw, object : TypeReference<CacheOverviewRetrieveResult>() {})
    }

    /** Create */
    suspend fun cacheRefreshCreate(): CacheRefreshCreateResult? {
        val raw = client.post(ApiPaths.backendPath("/system/cache/refresh"), null)
        return client.convertValue(raw, object : TypeReference<CacheRefreshCreateResult>() {})
    }

    /** Retrieve */
    suspend fun dashboardAdminOverviewRetrieve(): DashboardAdminOverviewRetrieveResult? {
        val raw = client.get(ApiPaths.backendPath("/system/dashboard/admin/overview"))
        return client.convertValue(raw, object : TypeReference<DashboardAdminOverviewRetrieveResult>() {})
    }

    /** List */
    suspend fun firewallsRulesList(): FirewallsRulesListResult? {
        val raw = client.get(ApiPaths.backendPath("/system/firewalls/rules"))
        return client.convertValue(raw, object : TypeReference<FirewallsRulesListResult>() {})
    }

    /** Create */
    suspend fun firewallsRulesCreate(): FirewallsRulesCreateResult? {
        val raw = client.post(ApiPaths.backendPath("/system/firewalls/rules"), null)
        return client.convertValue(raw, object : TypeReference<FirewallsRulesCreateResult>() {})
    }

    /** Delete */
    suspend fun firewallsRulesDelete(ruleId: String): FirewallsRulesDeleteResult? {
        val raw = client.delete(ApiPaths.backendPath("/system/firewalls/rules/${serializePathParameter(ruleId, PathParameterSpec("ruleId", "simple", false))}"))
        return client.convertValue(raw, object : TypeReference<FirewallsRulesDeleteResult>() {})
    }

    /** Retrieve */
    suspend fun installationStatusRetrieve(): InstallationStatusRetrieveResult? {
        val raw = client.get(ApiPaths.backendPath("/system/installation/status"))
        return client.convertValue(raw, object : TypeReference<InstallationStatusRetrieveResult>() {})
    }

    /** List */
    suspend fun marketingReferralStatsList(): MarketingReferralStatsListResult? {
        val raw = client.get(ApiPaths.backendPath("/system/marketing/referral_stats"))
        return client.convertValue(raw, object : TypeReference<MarketingReferralStatsListResult>() {})
    }

    /** List */
    suspend fun monitorAlertsList(): MonitorAlertsListResult? {
        val raw = client.get(ApiPaths.backendPath("/system/monitor/alerts"))
        return client.convertValue(raw, object : TypeReference<MonitorAlertsListResult>() {})
    }

    /** List */
    suspend fun monitorNodesList(): MonitorNodesListResult? {
        val raw = client.get(ApiPaths.backendPath("/system/monitor/nodes"))
        return client.convertValue(raw, object : TypeReference<MonitorNodesListResult>() {})
    }

    /** List */
    suspend fun monitorPerformanceList(): MonitorPerformanceListResult? {
        val raw = client.get(ApiPaths.backendPath("/system/monitor/performance"))
        return client.convertValue(raw, object : TypeReference<MonitorPerformanceListResult>() {})
    }

    /** List */
    suspend fun rateLimitsApiKeysList(): RateLimitsApiKeysListResult? {
        val raw = client.get(ApiPaths.backendPath("/system/rate_limits/api_keys"))
        return client.convertValue(raw, object : TypeReference<RateLimitsApiKeysListResult>() {})
    }

    /** Create */
    suspend fun rateLimitsApiKeysCreate(): RateLimitsApiKeysCreateResult? {
        val raw = client.post(ApiPaths.backendPath("/system/rate_limits/api_keys"), null)
        return client.convertValue(raw, object : TypeReference<RateLimitsApiKeysCreateResult>() {})
    }

    /** List */
    suspend fun rateLimitsIpList(): RateLimitsIpListResult? {
        val raw = client.get(ApiPaths.backendPath("/system/rate_limits/ip"))
        return client.convertValue(raw, object : TypeReference<RateLimitsIpListResult>() {})
    }

    /** Create */
    suspend fun rateLimitsIpCreate(): RateLimitsIpCreateResult? {
        val raw = client.post(ApiPaths.backendPath("/system/rate_limits/ip"), null)
        return client.convertValue(raw, object : TypeReference<RateLimitsIpCreateResult>() {})
    }

    /** List */
    suspend fun rateLimitsModelsList(): RateLimitsModelsListResult? {
        val raw = client.get(ApiPaths.backendPath("/system/rate_limits/models"))
        return client.convertValue(raw, object : TypeReference<RateLimitsModelsListResult>() {})
    }

    /** Create */
    suspend fun rateLimitsModelsCreate(): RateLimitsModelsCreateResult? {
        val raw = client.post(ApiPaths.backendPath("/system/rate_limits/models"), null)
        return client.convertValue(raw, object : TypeReference<RateLimitsModelsCreateResult>() {})
    }

    /** List */
    suspend fun recordsList(): RecordsListResult? {
        val raw = client.get(ApiPaths.backendPath("/system/records"))
        return client.convertValue(raw, object : TypeReference<RecordsListResult>() {})
    }

    /** Retrieve */
    suspend fun runtimeRegionSettingsRetrieve(): RuntimeRegionSettingsRetrieveResult? {
        val raw = client.get(ApiPaths.backendPath("/system/runtime_region/settings"))
        return client.convertValue(raw, object : TypeReference<RuntimeRegionSettingsRetrieveResult>() {})
    }

    /** Update */
    suspend fun runtimeRegionSettingsUpdate(): RuntimeRegionSettingsUpdateResult? {
        val raw = client.patch(ApiPaths.backendPath("/system/runtime_region/settings"), null)
        return client.convertValue(raw, object : TypeReference<RuntimeRegionSettingsUpdateResult>() {})
    }

    /** List */
    suspend fun serviceNodesList(): ServiceNodesListResult? {
        val raw = client.get(ApiPaths.backendPath("/system/service_nodes"))
        return client.convertValue(raw, object : TypeReference<ServiceNodesListResult>() {})
    }

    /** Create */
    suspend fun serviceNodesCreate(): ServiceNodesCreateResult? {
        val raw = client.post(ApiPaths.backendPath("/system/service_nodes"), null)
        return client.convertValue(raw, object : TypeReference<ServiceNodesCreateResult>() {})
    }

    /** Delete */
    suspend fun serviceNodesDelete(nodeId: String): ServiceNodesDeleteResult? {
        val raw = client.delete(ApiPaths.backendPath("/system/service_nodes/${serializePathParameter(nodeId, PathParameterSpec("nodeId", "simple", false))}"))
        return client.convertValue(raw, object : TypeReference<ServiceNodesDeleteResult>() {})
    }

    /** Update */
    suspend fun serviceNodesUpdate(nodeId: String): ServiceNodesUpdateResult? {
        val raw = client.put(ApiPaths.backendPath("/system/service_nodes/${serializePathParameter(nodeId, PathParameterSpec("nodeId", "simple", false))}"), null)
        return client.convertValue(raw, object : TypeReference<ServiceNodesUpdateResult>() {})
    }

    /** Update */
    suspend fun serviceNodesStatusUpdate(nodeId: String): ServiceNodesStatusUpdateResult? {
        val raw = client.put(ApiPaths.backendPath("/system/service_nodes/${serializePathParameter(nodeId, PathParameterSpec("nodeId", "simple", false))}/status"), null)
        return client.convertValue(raw, object : TypeReference<ServiceNodesStatusUpdateResult>() {})
    }

    /** Create */
    suspend fun shopsCreate(): ShopsCreateResult? {
        val raw = client.post(ApiPaths.backendPath("/system/shops"), null)
        return client.convertValue(raw, object : TypeReference<ShopsCreateResult>() {})
    }

    /** Update */
    suspend fun shopsUpdate(shopId: String): ShopsUpdateResult? {
        val raw = client.patch(ApiPaths.backendPath("/system/shops/${serializePathParameter(shopId, PathParameterSpec("shopId", "simple", false))}"), null)
        return client.convertValue(raw, object : TypeReference<ShopsUpdateResult>() {})
    }

    /** Approve */
    suspend fun shopsApprove(shopId: String): ShopsApproveResult? {
        val raw = client.post(ApiPaths.backendPath("/system/shops/${serializePathParameter(shopId, PathParameterSpec("shopId", "simple", false))}/approve"), null)
        return client.convertValue(raw, object : TypeReference<ShopsApproveResult>() {})
    }

    /** Upsert */
    suspend fun shopsBrandAuthorizationsUpsert(shopId: String): ShopsBrandAuthorizationsUpsertResult? {
        val raw = client.put(ApiPaths.backendPath("/system/shops/${serializePathParameter(shopId, PathParameterSpec("shopId", "simple", false))}/brand_authorizations"), null)
        return client.convertValue(raw, object : TypeReference<ShopsBrandAuthorizationsUpsertResult>() {})
    }

    /** Update */
    suspend fun shopsBusinessHoursUpdate(shopId: String): ShopsBusinessHoursUpdateResult? {
        val raw = client.patch(ApiPaths.backendPath("/system/shops/${serializePathParameter(shopId, PathParameterSpec("shopId", "simple", false))}/business_hours"), null)
        return client.convertValue(raw, object : TypeReference<ShopsBusinessHoursUpdateResult>() {})
    }

    /** Upsert */
    suspend fun shopsCategoryBindingsUpsert(shopId: String): ShopsCategoryBindingsUpsertResult? {
        val raw = client.put(ApiPaths.backendPath("/system/shops/${serializePathParameter(shopId, PathParameterSpec("shopId", "simple", false))}/category_bindings"), null)
        return client.convertValue(raw, object : TypeReference<ShopsCategoryBindingsUpsertResult>() {})
    }

    /** Create */
    suspend fun shopsChannelsCreate(shopId: String): ShopsChannelsCreateResult? {
        val raw = client.post(ApiPaths.backendPath("/system/shops/${serializePathParameter(shopId, PathParameterSpec("shopId", "simple", false))}/channels"), null)
        return client.convertValue(raw, object : TypeReference<ShopsChannelsCreateResult>() {})
    }

    /** Update */
    suspend fun shopsChannelsUpdate(shopId: String, channelId: String): ShopsChannelsUpdateResult? {
        val raw = client.patch(ApiPaths.backendPath("/system/shops/${serializePathParameter(shopId, PathParameterSpec("shopId", "simple", false))}/channels/${serializePathParameter(channelId, PathParameterSpec("channelId", "simple", false))}"), null)
        return client.convertValue(raw, object : TypeReference<ShopsChannelsUpdateResult>() {})
    }

    /** Close */
    suspend fun shopsClose(shopId: String): ShopsCloseResult? {
        val raw = client.post(ApiPaths.backendPath("/system/shops/${serializePathParameter(shopId, PathParameterSpec("shopId", "simple", false))}/close"), null)
        return client.convertValue(raw, object : TypeReference<ShopsCloseResult>() {})
    }

    /** Upsert */
    suspend fun shopsCustomerServicesUpsert(shopId: String): ShopsCustomerServicesUpsertResult? {
        val raw = client.put(ApiPaths.backendPath("/system/shops/${serializePathParameter(shopId, PathParameterSpec("shopId", "simple", false))}/customer_services"), null)
        return client.convertValue(raw, object : TypeReference<ShopsCustomerServicesUpsertResult>() {})
    }

    /** Update */
    suspend fun shopsDepositAccountUpdate(shopId: String): ShopsDepositAccountUpdateResult? {
        val raw = client.patch(ApiPaths.backendPath("/system/shops/${serializePathParameter(shopId, PathParameterSpec("shopId", "simple", false))}/deposit_account"), null)
        return client.convertValue(raw, object : TypeReference<ShopsDepositAccountUpdateResult>() {})
    }

    /** Review */
    suspend fun shopsDepositAccountReview(shopId: String): ShopsDepositAccountReviewResult? {
        val raw = client.post(ApiPaths.backendPath("/system/shops/${serializePathParameter(shopId, PathParameterSpec("shopId", "simple", false))}/deposit_account/review"), null)
        return client.convertValue(raw, object : TypeReference<ShopsDepositAccountReviewResult>() {})
    }

    /** Update */
    suspend fun shopsFulfillmentProfileUpdate(shopId: String): ShopsFulfillmentProfileUpdateResult? {
        val raw = client.patch(ApiPaths.backendPath("/system/shops/${serializePathParameter(shopId, PathParameterSpec("shopId", "simple", false))}/fulfillment_profile"), null)
        return client.convertValue(raw, object : TypeReference<ShopsFulfillmentProfileUpdateResult>() {})
    }

    /** Create */
    suspend fun shopsPoliciesCreate(shopId: String): ShopsPoliciesCreateResult? {
        val raw = client.post(ApiPaths.backendPath("/system/shops/${serializePathParameter(shopId, PathParameterSpec("shopId", "simple", false))}/policies"), null)
        return client.convertValue(raw, object : TypeReference<ShopsPoliciesCreateResult>() {})
    }

    /** Update */
    suspend fun shopsPoliciesUpdate(shopId: String, policyId: String): ShopsPoliciesUpdateResult? {
        val raw = client.patch(ApiPaths.backendPath("/system/shops/${serializePathParameter(shopId, PathParameterSpec("shopId", "simple", false))}/policies/${serializePathParameter(policyId, PathParameterSpec("policyId", "simple", false))}"), null)
        return client.convertValue(raw, object : TypeReference<ShopsPoliciesUpdateResult>() {})
    }

    /** Upsert */
    suspend fun shopsQualificationsUpsert(shopId: String): ShopsQualificationsUpsertResult? {
        val raw = client.put(ApiPaths.backendPath("/system/shops/${serializePathParameter(shopId, PathParameterSpec("shopId", "simple", false))}/qualifications"), null)
        return client.convertValue(raw, object : TypeReference<ShopsQualificationsUpsertResult>() {})
    }

    /** Reject */
    suspend fun shopsReject(shopId: String): ShopsRejectResult? {
        val raw = client.post(ApiPaths.backendPath("/system/shops/${serializePathParameter(shopId, PathParameterSpec("shopId", "simple", false))}/reject"), null)
        return client.convertValue(raw, object : TypeReference<ShopsRejectResult>() {})
    }

    /** Resume */
    suspend fun shopsResume(shopId: String): ShopsResumeResult? {
        val raw = client.post(ApiPaths.backendPath("/system/shops/${serializePathParameter(shopId, PathParameterSpec("shopId", "simple", false))}/resume"), null)
        return client.convertValue(raw, object : TypeReference<ShopsResumeResult>() {})
    }

    /** Upsert */
    suspend fun shopsReturnAddressesUpsert(shopId: String): ShopsReturnAddressesUpsertResult? {
        val raw = client.put(ApiPaths.backendPath("/system/shops/${serializePathParameter(shopId, PathParameterSpec("shopId", "simple", false))}/return_addresses"), null)
        return client.convertValue(raw, object : TypeReference<ShopsReturnAddressesUpsertResult>() {})
    }

    /** Create */
    suspend fun shopsRiskSignalsCreate(shopId: String): ShopsRiskSignalsCreateResult? {
        val raw = client.post(ApiPaths.backendPath("/system/shops/${serializePathParameter(shopId, PathParameterSpec("shopId", "simple", false))}/risk_signals"), null)
        return client.convertValue(raw, object : TypeReference<ShopsRiskSignalsCreateResult>() {})
    }

    /** Resolve */
    suspend fun shopsRiskSignalsResolve(shopId: String, riskSignalId: String): ShopsRiskSignalsResolveResult? {
        val raw = client.post(ApiPaths.backendPath("/system/shops/${serializePathParameter(shopId, PathParameterSpec("shopId", "simple", false))}/risk_signals/${serializePathParameter(riskSignalId, PathParameterSpec("riskSignalId", "simple", false))}/resolve"), null)
        return client.convertValue(raw, object : TypeReference<ShopsRiskSignalsResolveResult>() {})
    }

    /** Create */
    suspend fun shopsServiceAreasCreate(shopId: String): ShopsServiceAreasCreateResult? {
        val raw = client.post(ApiPaths.backendPath("/system/shops/${serializePathParameter(shopId, PathParameterSpec("shopId", "simple", false))}/service_areas"), null)
        return client.convertValue(raw, object : TypeReference<ShopsServiceAreasCreateResult>() {})
    }

    /** Update */
    suspend fun shopsServiceAreasUpdate(shopId: String, serviceAreaId: String): ShopsServiceAreasUpdateResult? {
        val raw = client.patch(ApiPaths.backendPath("/system/shops/${serializePathParameter(shopId, PathParameterSpec("shopId", "simple", false))}/service_areas/${serializePathParameter(serviceAreaId, PathParameterSpec("serviceAreaId", "simple", false))}"), null)
        return client.convertValue(raw, object : TypeReference<ShopsServiceAreasUpdateResult>() {})
    }

    /** Update */
    suspend fun shopsSettlementProfileUpdate(shopId: String): ShopsSettlementProfileUpdateResult? {
        val raw = client.patch(ApiPaths.backendPath("/system/shops/${serializePathParameter(shopId, PathParameterSpec("shopId", "simple", false))}/settlement_profile"), null)
        return client.convertValue(raw, object : TypeReference<ShopsSettlementProfileUpdateResult>() {})
    }

    /** Approve */
    suspend fun shopsSettlementProfileApprove(shopId: String): ShopsSettlementProfileApproveResult? {
        val raw = client.post(ApiPaths.backendPath("/system/shops/${serializePathParameter(shopId, PathParameterSpec("shopId", "simple", false))}/settlement_profile/approve"), null)
        return client.convertValue(raw, object : TypeReference<ShopsSettlementProfileApproveResult>() {})
    }

    /** Reject */
    suspend fun shopsSettlementProfileReject(shopId: String): ShopsSettlementProfileRejectResult? {
        val raw = client.post(ApiPaths.backendPath("/system/shops/${serializePathParameter(shopId, PathParameterSpec("shopId", "simple", false))}/settlement_profile/reject"), null)
        return client.convertValue(raw, object : TypeReference<ShopsSettlementProfileRejectResult>() {})
    }

    /** Upsert */
    suspend fun shopsShippingTemplatesUpsert(shopId: String): ShopsShippingTemplatesUpsertResult? {
        val raw = client.put(ApiPaths.backendPath("/system/shops/${serializePathParameter(shopId, PathParameterSpec("shopId", "simple", false))}/shipping_templates"), null)
        return client.convertValue(raw, object : TypeReference<ShopsShippingTemplatesUpsertResult>() {})
    }

    /** Create review */
    suspend fun shopsSubmitReview(shopId: String): ShopsSubmitReviewResult? {
        val raw = client.post(ApiPaths.backendPath("/system/shops/${serializePathParameter(shopId, PathParameterSpec("shopId", "simple", false))}/submit_review"), null)
        return client.convertValue(raw, object : TypeReference<ShopsSubmitReviewResult>() {})
    }

    /** Suspend */
    suspend fun shopsSuspend(shopId: String): ShopsSuspendResult? {
        val raw = client.post(ApiPaths.backendPath("/system/shops/${serializePathParameter(shopId, PathParameterSpec("shopId", "simple", false))}/suspend"), null)
        return client.convertValue(raw, object : TypeReference<ShopsSuspendResult>() {})
    }

    /** Update */
    suspend fun shopsVerificationsUpdate(shopId: String, verificationId: String): ShopsVerificationsUpdateResult? {
        val raw = client.patch(ApiPaths.backendPath("/system/shops/${serializePathParameter(shopId, PathParameterSpec("shopId", "simple", false))}/verifications/${serializePathParameter(verificationId, PathParameterSpec("verificationId", "simple", false))}"), null)
        return client.convertValue(raw, object : TypeReference<ShopsVerificationsUpdateResult>() {})
    }

    /** Retrieve */
    suspend fun siteSettingsRetrieve(): SiteSettingsRetrieveResult? {
        val raw = client.get(ApiPaths.backendPath("/system/site/settings"))
        return client.convertValue(raw, object : TypeReference<SiteSettingsRetrieveResult>() {})
    }

    /** Update */
    suspend fun siteSettingsUpdate(): SiteSettingsUpdateResult? {
        val raw = client.patch(ApiPaths.backendPath("/system/site/settings"), null)
        return client.convertValue(raw, object : TypeReference<SiteSettingsUpdateResult>() {})
    }

    private data class PathParameterSpec(val name: String, val style: String, val explode: Boolean)

    private fun serializePathParameter(value: Any?, spec: PathParameterSpec): String {
        if (value == null) return ""
        val style = spec.style.ifBlank { "simple" }
        return when (value) {
            is Iterable<*> -> serializePathArray(spec.name, value, style, spec.explode)
            is Map<*, *> -> serializePathObject(spec.name, value, style, spec.explode)
            else -> pathPrimitivePrefix(spec.name, style) + pathEncode(value.toString())
        }
    }

    private fun serializePathArray(name: String, values: Iterable<*>, style: String, explode: Boolean): String {
        val serialized = values.mapNotNull { it?.toString()?.let(::pathEncode) }
        if (serialized.isEmpty()) return pathPrefix(name, style)
        if (style == "matrix") {
            if (explode) {
                return serialized.joinToString("") { ";$name=$it" }
            }
            return ";$name=" + serialized.joinToString(",")
        }
        val separator = if (explode) "." else ","
        return pathPrefix(name, style) + serialized.joinToString(separator)
    }

    private fun serializePathObject(name: String, values: Map<*, *>, style: String, explode: Boolean): String {
        val entries = mutableListOf<String>()
        val exploded = mutableListOf<String>()
        values.forEach { (key, value) ->
            if (value == null) return@forEach
            val escapedKey = pathEncode(key.toString())
            val escapedValue = pathEncode(value.toString())
            if (explode) {
                if (style == "matrix") {
                    exploded += ";$escapedKey=$escapedValue"
                } else {
                    exploded += "$escapedKey=$escapedValue"
                }
            } else {
                entries += escapedKey
                entries += escapedValue
            }
        }
        if (style == "matrix") {
            if (explode) return exploded.joinToString("")
            return ";$name=" + entries.joinToString(",")
        }
        if (explode) {
            val separator = if (style == "label") "." else ","
            return pathPrefix(name, style) + exploded.joinToString(separator)
        }
        return pathPrefix(name, style) + entries.joinToString(",")
    }

    private fun pathPrefix(name: String, style: String): String {
        return when (style) {
            "label" -> "."
            "matrix" -> ";$name"
            else -> ""
        }
    }

    private fun pathPrimitivePrefix(name: String, style: String): String {
        return if (style == "matrix") ";$name=" else pathPrefix(name, style)
    }

    private fun pathEncode(value: String): String {
        return java.net.URLEncoder.encode(value, java.nio.charset.StandardCharsets.UTF_8).replace("+", "%20")
    }

    private data class QueryParameterSpec(
        val name: String,
        val value: Any?,
        val style: String,
        val explode: Boolean,
        val allowReserved: Boolean,
        val contentType: String?,
    )

    private val queryObjectMapper = ObjectMapper().registerKotlinModule()

    private fun buildQueryString(parameters: List<QueryParameterSpec>): String {
        val pairs = mutableListOf<String>()
        parameters.forEach { appendSerializedParameter(pairs, it) }
        return pairs.joinToString("&")
    }

    private fun appendSerializedParameter(pairs: MutableList<String>, parameter: QueryParameterSpec) {
        val value = parameter.value ?: return
        if (!parameter.contentType.isNullOrBlank()) {
            val json = queryObjectMapper.writeValueAsString(value)
            pairs += urlEncode(parameter.name) + "=" + encodeQueryValue(json, parameter.allowReserved)
            return
        }

        val style = parameter.style.ifBlank { "form" }
        when (value) {
            is Iterable<*> -> appendArrayParameter(pairs, parameter.name, value, style, parameter.explode, parameter.allowReserved)
            is Map<*, *> -> if (style == "deepObject") {
                appendDeepObjectParameter(pairs, parameter.name, value, parameter.allowReserved)
            } else {
                appendObjectParameter(pairs, parameter.name, value, style, parameter.explode, parameter.allowReserved)
            }
            else -> pairs += urlEncode(parameter.name) + "=" + encodeQueryValue(value.toString(), parameter.allowReserved)
        }
    }

    private fun appendArrayParameter(
        pairs: MutableList<String>,
        name: String,
        values: Iterable<*>,
        style: String,
        explode: Boolean,
        allowReserved: Boolean,
    ) {
        val serialized = values.mapNotNull { it?.toString() }
        if (serialized.isEmpty()) return
        if (style == "form" && explode) {
            serialized.forEach { pairs += urlEncode(name) + "=" + encodeQueryValue(it, allowReserved) }
            return
        }
        pairs += urlEncode(name) + "=" + encodeQueryValue(serialized.joinToString(","), allowReserved)
    }

    private fun appendObjectParameter(
        pairs: MutableList<String>,
        name: String,
        values: Map<*, *>,
        style: String,
        explode: Boolean,
        allowReserved: Boolean,
    ) {
        val serialized = mutableListOf<String>()
        values.forEach { (key, value) ->
            if (value == null) return@forEach
            if (style == "form" && explode) {
                pairs += urlEncode(key.toString()) + "=" + encodeQueryValue(value.toString(), allowReserved)
            } else {
                serialized += key.toString()
                serialized += value.toString()
            }
        }
        if (serialized.isNotEmpty()) {
            pairs += urlEncode(name) + "=" + encodeQueryValue(serialized.joinToString(","), allowReserved)
        }
    }

    private fun appendDeepObjectParameter(pairs: MutableList<String>, name: String, values: Map<*, *>, allowReserved: Boolean) {
        values.forEach { (key, value) ->
            if (value != null) {
                pairs += urlEncode("$name[$key]") + "=" + encodeQueryValue(value.toString(), allowReserved)
            }
        }
    }

    private fun encodeQueryValue(value: String, allowReserved: Boolean): String {
        var encoded = urlEncode(value)
        if (!allowReserved) return encoded
        mapOf(
            "%3A" to ":", "%2F" to "/", "%3F" to "?", "%23" to "#",
            "%5B" to "[", "%5D" to "]", "%40" to "@", "%21" to "!",
            "%24" to "$", "%26" to "&", "%27" to "'", "%28" to "(",
            "%29" to ")", "%2A" to "*", "%2B" to "+", "%2C" to ",",
            "%3B" to ";", "%3D" to "=",
        ).forEach { (escaped, reserved) -> encoded = encoded.replace(escaped, reserved) }
        return encoded
    }

    private fun urlEncode(value: String): String {
        return java.net.URLEncoder.encode(value, java.nio.charset.StandardCharsets.UTF_8)
    }

}
