package com.sdkwork.clawrouter.app.api

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import com.sdkwork.clawrouter.app.*
import com.sdkwork.clawrouter.app.http.HttpClient

class SystemApi(private val client: HttpClient) {

    /** List */
    suspend fun afterSalesRequestsList(): AfterSalesRequestsListResult? {
        val raw = client.get(ApiPaths.appPath("/after_sales/requests"))
        return client.convertValue(raw, object : TypeReference<AfterSalesRequestsListResult>() {})
    }

    /** Retrieve */
    suspend fun afterSalesRequestsRetrieve(afterSalesRequestId: String): AfterSalesRequestsRetrieveResult? {
        val raw = client.get(ApiPaths.appPath("/after_sales/requests/${serializePathParameter(afterSalesRequestId, PathParameterSpec("afterSalesRequestId", "simple", false))}"))
        return client.convertValue(raw, object : TypeReference<AfterSalesRequestsRetrieveResult>() {})
    }

    /** List */
    suspend fun afterSalesEventsList(afterSalesRequestId: String): AfterSalesEventsListResult? {
        val raw = client.get(ApiPaths.appPath("/after_sales/requests/${serializePathParameter(afterSalesRequestId, PathParameterSpec("afterSalesRequestId", "simple", false))}/events"))
        return client.convertValue(raw, object : TypeReference<AfterSalesEventsListResult>() {})
    }

    /** List */
    suspend fun afterSalesReturnShipmentsList(afterSalesRequestId: String): AfterSalesReturnShipmentsListResult? {
        val raw = client.get(ApiPaths.appPath("/after_sales/requests/${serializePathParameter(afterSalesRequestId, PathParameterSpec("afterSalesRequestId", "simple", false))}/return_shipments"))
        return client.convertValue(raw, object : TypeReference<AfterSalesReturnShipmentsListResult>() {})
    }

    /** List */
    suspend fun shopsList(): ShopsListResult? {
        val raw = client.get(ApiPaths.appPath("/shops"))
        return client.convertValue(raw, object : TypeReference<ShopsListResult>() {})
    }

    /** Retrieve */
    suspend fun shopsCurrentRetrieve(): ShopsCurrentRetrieveResult? {
        val raw = client.get(ApiPaths.appPath("/shops/current"))
        return client.convertValue(raw, object : TypeReference<ShopsCurrentRetrieveResult>() {})
    }

    /** List */
    suspend fun shopsCurrentApplicationsList(): ShopsCurrentApplicationsListResult? {
        val raw = client.get(ApiPaths.appPath("/shops/current/applications"))
        return client.convertValue(raw, object : TypeReference<ShopsCurrentApplicationsListResult>() {})
    }

    /** List */
    suspend fun shopsCurrentBrandAuthorizationsList(): ShopsCurrentBrandAuthorizationsListResult? {
        val raw = client.get(ApiPaths.appPath("/shops/current/brand_authorizations"))
        return client.convertValue(raw, object : TypeReference<ShopsCurrentBrandAuthorizationsListResult>() {})
    }

    /** Retrieve */
    suspend fun shopsCurrentBusinessHoursRetrieve(): ShopsCurrentBusinessHoursRetrieveResult? {
        val raw = client.get(ApiPaths.appPath("/shops/current/business_hours"))
        return client.convertValue(raw, object : TypeReference<ShopsCurrentBusinessHoursRetrieveResult>() {})
    }

    /** List */
    suspend fun shopsCurrentCategoryBindingsList(): ShopsCurrentCategoryBindingsListResult? {
        val raw = client.get(ApiPaths.appPath("/shops/current/category_bindings"))
        return client.convertValue(raw, object : TypeReference<ShopsCurrentCategoryBindingsListResult>() {})
    }

    /** List */
    suspend fun shopsCurrentChannelsList(): ShopsCurrentChannelsListResult? {
        val raw = client.get(ApiPaths.appPath("/shops/current/channels"))
        return client.convertValue(raw, object : TypeReference<ShopsCurrentChannelsListResult>() {})
    }

    /** List */
    suspend fun shopsCurrentCustomerServicesList(): ShopsCurrentCustomerServicesListResult? {
        val raw = client.get(ApiPaths.appPath("/shops/current/customer_services"))
        return client.convertValue(raw, object : TypeReference<ShopsCurrentCustomerServicesListResult>() {})
    }

    /** Retrieve */
    suspend fun shopsCurrentDashboardRetrieve(): ShopsCurrentDashboardRetrieveResult? {
        val raw = client.get(ApiPaths.appPath("/shops/current/dashboard"))
        return client.convertValue(raw, object : TypeReference<ShopsCurrentDashboardRetrieveResult>() {})
    }

    /** Retrieve */
    suspend fun shopsCurrentDepositAccountRetrieve(): ShopsCurrentDepositAccountRetrieveResult? {
        val raw = client.get(ApiPaths.appPath("/shops/current/deposit_account"))
        return client.convertValue(raw, object : TypeReference<ShopsCurrentDepositAccountRetrieveResult>() {})
    }

    /** Retrieve */
    suspend fun shopsCurrentFulfillmentProfileRetrieve(): ShopsCurrentFulfillmentProfileRetrieveResult? {
        val raw = client.get(ApiPaths.appPath("/shops/current/fulfillment_profile"))
        return client.convertValue(raw, object : TypeReference<ShopsCurrentFulfillmentProfileRetrieveResult>() {})
    }

    /** List */
    suspend fun shopsCurrentInventoryStocksList(): ShopsCurrentInventoryStocksListResult? {
        val raw = client.get(ApiPaths.appPath("/shops/current/inventory/stocks"))
        return client.convertValue(raw, object : TypeReference<ShopsCurrentInventoryStocksListResult>() {})
    }

    /** List */
    suspend fun shopsCurrentOrdersList(): ShopsCurrentOrdersListResult? {
        val raw = client.get(ApiPaths.appPath("/shops/current/orders"))
        return client.convertValue(raw, object : TypeReference<ShopsCurrentOrdersListResult>() {})
    }

    /** Retrieve */
    suspend fun shopsCurrentOrdersRetrieve(orderId: String): ShopsCurrentOrdersRetrieveResult? {
        val raw = client.get(ApiPaths.appPath("/shops/current/orders/${serializePathParameter(orderId, PathParameterSpec("orderId", "simple", false))}"))
        return client.convertValue(raw, object : TypeReference<ShopsCurrentOrdersRetrieveResult>() {})
    }

    /** List */
    suspend fun shopsCurrentPoliciesList(): ShopsCurrentPoliciesListResult? {
        val raw = client.get(ApiPaths.appPath("/shops/current/policies"))
        return client.convertValue(raw, object : TypeReference<ShopsCurrentPoliciesListResult>() {})
    }

    /** List */
    suspend fun shopsCurrentProductsList(): ShopsCurrentProductsListResult? {
        val raw = client.get(ApiPaths.appPath("/shops/current/products"))
        return client.convertValue(raw, object : TypeReference<ShopsCurrentProductsListResult>() {})
    }

    /** List */
    suspend fun shopsCurrentQualificationsList(): ShopsCurrentQualificationsListResult? {
        val raw = client.get(ApiPaths.appPath("/shops/current/qualifications"))
        return client.convertValue(raw, object : TypeReference<ShopsCurrentQualificationsListResult>() {})
    }

    /** Retrieve */
    suspend fun shopsCurrentReadinessRetrieve(): ShopsCurrentReadinessRetrieveResult? {
        val raw = client.get(ApiPaths.appPath("/shops/current/readiness"))
        return client.convertValue(raw, object : TypeReference<ShopsCurrentReadinessRetrieveResult>() {})
    }

    /** List */
    suspend fun shopsCurrentReturnAddressesList(): ShopsCurrentReturnAddressesListResult? {
        val raw = client.get(ApiPaths.appPath("/shops/current/return_addresses"))
        return client.convertValue(raw, object : TypeReference<ShopsCurrentReturnAddressesListResult>() {})
    }

    /** List */
    suspend fun shopsCurrentRiskSignalsList(): ShopsCurrentRiskSignalsListResult? {
        val raw = client.get(ApiPaths.appPath("/shops/current/risk_signals"))
        return client.convertValue(raw, object : TypeReference<ShopsCurrentRiskSignalsListResult>() {})
    }

    /** List */
    suspend fun shopsCurrentServiceAreasList(): ShopsCurrentServiceAreasListResult? {
        val raw = client.get(ApiPaths.appPath("/shops/current/service_areas"))
        return client.convertValue(raw, object : TypeReference<ShopsCurrentServiceAreasListResult>() {})
    }

    /** Retrieve */
    suspend fun shopsCurrentSettlementProfileRetrieve(): ShopsCurrentSettlementProfileRetrieveResult? {
        val raw = client.get(ApiPaths.appPath("/shops/current/settlement_profile"))
        return client.convertValue(raw, object : TypeReference<ShopsCurrentSettlementProfileRetrieveResult>() {})
    }

    /** List */
    suspend fun shopsCurrentSettlementsList(): ShopsCurrentSettlementsListResult? {
        val raw = client.get(ApiPaths.appPath("/shops/current/settlements"))
        return client.convertValue(raw, object : TypeReference<ShopsCurrentSettlementsListResult>() {})
    }

    /** List */
    suspend fun shopsCurrentShippingTemplatesList(): ShopsCurrentShippingTemplatesListResult? {
        val raw = client.get(ApiPaths.appPath("/shops/current/shipping_templates"))
        return client.convertValue(raw, object : TypeReference<ShopsCurrentShippingTemplatesListResult>() {})
    }

    /** List */
    suspend fun shopsCurrentStatusEventsList(): ShopsCurrentStatusEventsListResult? {
        val raw = client.get(ApiPaths.appPath("/shops/current/status_events"))
        return client.convertValue(raw, object : TypeReference<ShopsCurrentStatusEventsListResult>() {})
    }

    /** List */
    suspend fun shopsCurrentVerificationsList(): ShopsCurrentVerificationsListResult? {
        val raw = client.get(ApiPaths.appPath("/shops/current/verifications"))
        return client.convertValue(raw, object : TypeReference<ShopsCurrentVerificationsListResult>() {})
    }

    /** Retrieve */
    suspend fun shopsRetrieve(shopId: String): ShopsRetrieveResult? {
        val raw = client.get(ApiPaths.appPath("/shops/${serializePathParameter(shopId, PathParameterSpec("shopId", "simple", false))}"))
        return client.convertValue(raw, object : TypeReference<ShopsRetrieveResult>() {})
    }

    /** Create */
    suspend fun afterSalesRequestsCreate(): AfterSalesRequestsCreateResult? {
        val raw = client.post(ApiPaths.appPath("/system/after_sales/requests"), null)
        return client.convertValue(raw, object : TypeReference<AfterSalesRequestsCreateResult>() {})
    }

    /** Update */
    suspend fun afterSalesRequestsUpdate(afterSalesRequestId: String): AfterSalesRequestsUpdateResult? {
        val raw = client.patch(ApiPaths.appPath("/system/after_sales/requests/${serializePathParameter(afterSalesRequestId, PathParameterSpec("afterSalesRequestId", "simple", false))}"), null)
        return client.convertValue(raw, object : TypeReference<AfterSalesRequestsUpdateResult>() {})
    }

    /** Create */
    suspend fun afterSalesReturnShipmentsCreate(afterSalesRequestId: String): AfterSalesReturnShipmentsCreateResult? {
        val raw = client.post(ApiPaths.appPath("/system/after_sales/requests/${serializePathParameter(afterSalesRequestId, PathParameterSpec("afterSalesRequestId", "simple", false))}/return_shipments"), null)
        return client.convertValue(raw, object : TypeReference<AfterSalesReturnShipmentsCreateResult>() {})
    }

    /** Create */
    suspend fun shopsCurrentApplicationsCreate(): ShopsCurrentApplicationsCreateResult? {
        val raw = client.post(ApiPaths.appPath("/system/shops/current/applications"), null)
        return client.convertValue(raw, object : TypeReference<ShopsCurrentApplicationsCreateResult>() {})
    }

    /** Upsert */
    suspend fun shopsCurrentBrandAuthorizationsUpsert(): ShopsCurrentBrandAuthorizationsUpsertResult? {
        val raw = client.put(ApiPaths.appPath("/system/shops/current/brand_authorizations"), null)
        return client.convertValue(raw, object : TypeReference<ShopsCurrentBrandAuthorizationsUpsertResult>() {})
    }

    /** Update */
    suspend fun shopsCurrentBusinessHoursUpdate(): ShopsCurrentBusinessHoursUpdateResult? {
        val raw = client.patch(ApiPaths.appPath("/system/shops/current/business_hours"), null)
        return client.convertValue(raw, object : TypeReference<ShopsCurrentBusinessHoursUpdateResult>() {})
    }

    /** Upsert */
    suspend fun shopsCurrentCategoryBindingsUpsert(): ShopsCurrentCategoryBindingsUpsertResult? {
        val raw = client.put(ApiPaths.appPath("/system/shops/current/category_bindings"), null)
        return client.convertValue(raw, object : TypeReference<ShopsCurrentCategoryBindingsUpsertResult>() {})
    }

    /** Update */
    suspend fun shopsCurrentChannelsUpdate(channelId: String): ShopsCurrentChannelsUpdateResult? {
        val raw = client.patch(ApiPaths.appPath("/system/shops/current/channels/${serializePathParameter(channelId, PathParameterSpec("channelId", "simple", false))}"), null)
        return client.convertValue(raw, object : TypeReference<ShopsCurrentChannelsUpdateResult>() {})
    }

    /** Upsert */
    suspend fun shopsCurrentCustomerServicesUpsert(): ShopsCurrentCustomerServicesUpsertResult? {
        val raw = client.put(ApiPaths.appPath("/system/shops/current/customer_services"), null)
        return client.convertValue(raw, object : TypeReference<ShopsCurrentCustomerServicesUpsertResult>() {})
    }

    /** Update */
    suspend fun shopsCurrentFulfillmentProfileUpdate(): ShopsCurrentFulfillmentProfileUpdateResult? {
        val raw = client.patch(ApiPaths.appPath("/system/shops/current/fulfillment_profile"), null)
        return client.convertValue(raw, object : TypeReference<ShopsCurrentFulfillmentProfileUpdateResult>() {})
    }

    /** Create */
    suspend fun shopsCurrentInventoryStocksAdjustmentsCreate(stockId: String): ShopsCurrentInventoryStocksAdjustmentsCreateResult? {
        val raw = client.post(ApiPaths.appPath("/system/shops/current/inventory/stocks/${serializePathParameter(stockId, PathParameterSpec("stockId", "simple", false))}/adjustments"), null)
        return client.convertValue(raw, object : TypeReference<ShopsCurrentInventoryStocksAdjustmentsCreateResult>() {})
    }

    /** Create */
    suspend fun shopsCurrentOrdersFulfillmentsCreate(orderId: String): ShopsCurrentOrdersFulfillmentsCreateResult? {
        val raw = client.post(ApiPaths.appPath("/system/shops/current/orders/${serializePathParameter(orderId, PathParameterSpec("orderId", "simple", false))}/fulfillments"), null)
        return client.convertValue(raw, object : TypeReference<ShopsCurrentOrdersFulfillmentsCreateResult>() {})
    }

    /** Update */
    suspend fun shopsCurrentPoliciesUpdate(policyId: String): ShopsCurrentPoliciesUpdateResult? {
        val raw = client.patch(ApiPaths.appPath("/system/shops/current/policies/${serializePathParameter(policyId, PathParameterSpec("policyId", "simple", false))}"), null)
        return client.convertValue(raw, object : TypeReference<ShopsCurrentPoliciesUpdateResult>() {})
    }

    /** Create */
    suspend fun shopsCurrentProductsCreate(): ShopsCurrentProductsCreateResult? {
        val raw = client.post(ApiPaths.appPath("/system/shops/current/products"), null)
        return client.convertValue(raw, object : TypeReference<ShopsCurrentProductsCreateResult>() {})
    }

    /** Update */
    suspend fun shopsCurrentProductsUpdate(productId: String): ShopsCurrentProductsUpdateResult? {
        val raw = client.patch(ApiPaths.appPath("/system/shops/current/products/${serializePathParameter(productId, PathParameterSpec("productId", "simple", false))}"), null)
        return client.convertValue(raw, object : TypeReference<ShopsCurrentProductsUpdateResult>() {})
    }

    /** Publish */
    suspend fun shopsCurrentProductsPublish(productId: String): ShopsCurrentProductsPublishResult? {
        val raw = client.post(ApiPaths.appPath("/system/shops/current/products/${serializePathParameter(productId, PathParameterSpec("productId", "simple", false))}/publish"), null)
        return client.convertValue(raw, object : TypeReference<ShopsCurrentProductsPublishResult>() {})
    }

    /** Unpublish */
    suspend fun shopsCurrentProductsUnpublish(productId: String): ShopsCurrentProductsUnpublishResult? {
        val raw = client.post(ApiPaths.appPath("/system/shops/current/products/${serializePathParameter(productId, PathParameterSpec("productId", "simple", false))}/unpublish"), null)
        return client.convertValue(raw, object : TypeReference<ShopsCurrentProductsUnpublishResult>() {})
    }

    /** Upsert */
    suspend fun shopsCurrentQualificationsUpsert(): ShopsCurrentQualificationsUpsertResult? {
        val raw = client.put(ApiPaths.appPath("/system/shops/current/qualifications"), null)
        return client.convertValue(raw, object : TypeReference<ShopsCurrentQualificationsUpsertResult>() {})
    }

    /** Upsert */
    suspend fun shopsCurrentReturnAddressesUpsert(): ShopsCurrentReturnAddressesUpsertResult? {
        val raw = client.put(ApiPaths.appPath("/system/shops/current/return_addresses"), null)
        return client.convertValue(raw, object : TypeReference<ShopsCurrentReturnAddressesUpsertResult>() {})
    }

    /** Create */
    suspend fun shopsCurrentServiceAreasCreate(): ShopsCurrentServiceAreasCreateResult? {
        val raw = client.post(ApiPaths.appPath("/system/shops/current/service_areas"), null)
        return client.convertValue(raw, object : TypeReference<ShopsCurrentServiceAreasCreateResult>() {})
    }

    /** Update */
    suspend fun shopsCurrentServiceAreasUpdate(serviceAreaId: String): ShopsCurrentServiceAreasUpdateResult? {
        val raw = client.patch(ApiPaths.appPath("/system/shops/current/service_areas/${serializePathParameter(serviceAreaId, PathParameterSpec("serviceAreaId", "simple", false))}"), null)
        return client.convertValue(raw, object : TypeReference<ShopsCurrentServiceAreasUpdateResult>() {})
    }

    /** Update */
    suspend fun shopsCurrentSettlementProfileUpdate(): ShopsCurrentSettlementProfileUpdateResult? {
        val raw = client.patch(ApiPaths.appPath("/system/shops/current/settlement_profile"), null)
        return client.convertValue(raw, object : TypeReference<ShopsCurrentSettlementProfileUpdateResult>() {})
    }

    /** Upsert */
    suspend fun shopsCurrentShippingTemplatesUpsert(): ShopsCurrentShippingTemplatesUpsertResult? {
        val raw = client.put(ApiPaths.appPath("/system/shops/current/shipping_templates"), null)
        return client.convertValue(raw, object : TypeReference<ShopsCurrentShippingTemplatesUpsertResult>() {})
    }

    /** Retrieve */
    suspend fun siteRuntimeRetrieve(): SiteRuntimeRetrieveResult? {
        val raw = client.get(ApiPaths.appPath("/system/site/runtime"))
        return client.convertValue(raw, object : TypeReference<SiteRuntimeRetrieveResult>() {})
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


}
