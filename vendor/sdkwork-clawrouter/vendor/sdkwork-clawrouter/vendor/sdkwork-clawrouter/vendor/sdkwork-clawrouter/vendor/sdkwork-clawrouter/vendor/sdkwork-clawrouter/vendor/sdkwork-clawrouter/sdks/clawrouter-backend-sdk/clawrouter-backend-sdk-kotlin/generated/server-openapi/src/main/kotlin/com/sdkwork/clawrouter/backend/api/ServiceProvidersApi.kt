package com.sdkwork.clawrouter.backend.api

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import com.sdkwork.clawrouter.backend.*
import com.sdkwork.clawrouter.backend.http.HttpClient

class ServiceProvidersApi(private val client: HttpClient) {

    /** Service Provider Adjustments List */
    suspend fun adjustmentsList(page: String? = null, pageSize: String? = null, status: String? = null, providerId: String? = null, sellerProviderId: String? = null, buyerProviderId: String? = null, edgeId: String? = null): AdjustmentsListResult? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("page", page, "form", true, false, null),
            QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            QueryParameterSpec("status", status, "form", true, false, null),
            QueryParameterSpec("provider_id", providerId, "form", true, false, null),
            QueryParameterSpec("seller_provider_id", sellerProviderId, "form", true, false, null),
            QueryParameterSpec("buyer_provider_id", buyerProviderId, "form", true, false, null),
            QueryParameterSpec("edge_id", edgeId, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/service_providers/adjustments"), query))
        return client.convertValue(raw, object : TypeReference<AdjustmentsListResult>() {})
    }

    /** Service Provider Audit Events List */
    suspend fun auditEventsList(page: String? = null, pageSize: String? = null, status: String? = null, providerId: String? = null, sellerProviderId: String? = null, buyerProviderId: String? = null, edgeId: String? = null): AuditEventsListResult? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("page", page, "form", true, false, null),
            QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            QueryParameterSpec("status", status, "form", true, false, null),
            QueryParameterSpec("provider_id", providerId, "form", true, false, null),
            QueryParameterSpec("seller_provider_id", sellerProviderId, "form", true, false, null),
            QueryParameterSpec("buyer_provider_id", buyerProviderId, "form", true, false, null),
            QueryParameterSpec("edge_id", edgeId, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/service_providers/audit/events"), query))
        return client.convertValue(raw, object : TypeReference<AuditEventsListResult>() {})
    }

    /** Service Provider Bindings List */
    suspend fun bindingsList(page: String? = null, pageSize: String? = null, status: String? = null, providerId: String? = null, sellerProviderId: String? = null, buyerProviderId: String? = null, edgeId: String? = null): BindingsListResult? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("page", page, "form", true, false, null),
            QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            QueryParameterSpec("status", status, "form", true, false, null),
            QueryParameterSpec("provider_id", providerId, "form", true, false, null),
            QueryParameterSpec("seller_provider_id", sellerProviderId, "form", true, false, null),
            QueryParameterSpec("buyer_provider_id", buyerProviderId, "form", true, false, null),
            QueryParameterSpec("edge_id", edgeId, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/service_providers/bindings"), query))
        return client.convertValue(raw, object : TypeReference<BindingsListResult>() {})
    }

    /** Service Provider Contracts List */
    suspend fun contractsList(page: String? = null, pageSize: String? = null, status: String? = null, providerId: String? = null, sellerProviderId: String? = null, buyerProviderId: String? = null, edgeId: String? = null): ContractsListResult? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("page", page, "form", true, false, null),
            QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            QueryParameterSpec("status", status, "form", true, false, null),
            QueryParameterSpec("provider_id", providerId, "form", true, false, null),
            QueryParameterSpec("seller_provider_id", sellerProviderId, "form", true, false, null),
            QueryParameterSpec("buyer_provider_id", buyerProviderId, "form", true, false, null),
            QueryParameterSpec("edge_id", edgeId, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/service_providers/contracts"), query))
        return client.convertValue(raw, object : TypeReference<ContractsListResult>() {})
    }

    /** Service Provider Dashboard Retrieve */
    suspend fun dashboardRetrieve(page: String? = null, pageSize: String? = null, status: String? = null, providerId: String? = null, sellerProviderId: String? = null, buyerProviderId: String? = null, edgeId: String? = null): DashboardRetrieveResult? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("page", page, "form", true, false, null),
            QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            QueryParameterSpec("status", status, "form", true, false, null),
            QueryParameterSpec("provider_id", providerId, "form", true, false, null),
            QueryParameterSpec("seller_provider_id", sellerProviderId, "form", true, false, null),
            QueryParameterSpec("buyer_provider_id", buyerProviderId, "form", true, false, null),
            QueryParameterSpec("edge_id", edgeId, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/service_providers/dashboard"), query))
        return client.convertValue(raw, object : TypeReference<DashboardRetrieveResult>() {})
    }

    /** Service Provider Downstreams List */
    suspend fun downstreamsList(page: String? = null, pageSize: String? = null, status: String? = null, providerId: String? = null, sellerProviderId: String? = null, buyerProviderId: String? = null, edgeId: String? = null): DownstreamsListResult? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("page", page, "form", true, false, null),
            QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            QueryParameterSpec("status", status, "form", true, false, null),
            QueryParameterSpec("provider_id", providerId, "form", true, false, null),
            QueryParameterSpec("seller_provider_id", sellerProviderId, "form", true, false, null),
            QueryParameterSpec("buyer_provider_id", buyerProviderId, "form", true, false, null),
            QueryParameterSpec("edge_id", edgeId, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/service_providers/downstreams"), query))
        return client.convertValue(raw, object : TypeReference<DownstreamsListResult>() {})
    }

    /** Service Provider Downstream Create */
    suspend fun downstreamsCreate(body: ServiceProviderDownstreamCreateRequest, idempotencyKey: String): DownstreamsCreateResult? {
        val requestHeaders = buildRequestHeaders(
            mapOf(
                "Idempotency-Key" to HeaderParameterSpec(idempotencyKey, "simple", false, null),
            ),
            emptyMap()
        )
        val raw = client.post(ApiPaths.backendPath("/service_providers/downstreams"), body, null, requestHeaders, "application/json")
        return client.convertValue(raw, object : TypeReference<DownstreamsCreateResult>() {})
    }

    /** Service Provider Members List */
    suspend fun membersList(page: String? = null, pageSize: String? = null, status: String? = null, providerId: String? = null, sellerProviderId: String? = null, buyerProviderId: String? = null, edgeId: String? = null): MembersListResult? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("page", page, "form", true, false, null),
            QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            QueryParameterSpec("status", status, "form", true, false, null),
            QueryParameterSpec("provider_id", providerId, "form", true, false, null),
            QueryParameterSpec("seller_provider_id", sellerProviderId, "form", true, false, null),
            QueryParameterSpec("buyer_provider_id", buyerProviderId, "form", true, false, null),
            QueryParameterSpec("edge_id", edgeId, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/service_providers/members"), query))
        return client.convertValue(raw, object : TypeReference<MembersListResult>() {})
    }

    /** Service Provider Pricing Rules List */
    suspend fun pricingRulesList(page: String? = null, pageSize: String? = null, status: String? = null, providerId: String? = null, sellerProviderId: String? = null, buyerProviderId: String? = null, edgeId: String? = null): PricingRulesListResult? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("page", page, "form", true, false, null),
            QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            QueryParameterSpec("status", status, "form", true, false, null),
            QueryParameterSpec("provider_id", providerId, "form", true, false, null),
            QueryParameterSpec("seller_provider_id", sellerProviderId, "form", true, false, null),
            QueryParameterSpec("buyer_provider_id", buyerProviderId, "form", true, false, null),
            QueryParameterSpec("edge_id", edgeId, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/service_providers/pricing/rules"), query))
        return client.convertValue(raw, object : TypeReference<PricingRulesListResult>() {})
    }

    /** Service Provider Pricing Rule Create */
    suspend fun pricingRulesCreate(body: ServiceProviderPricingRuleCreateRequest, idempotencyKey: String): PricingRulesCreateResult? {
        val requestHeaders = buildRequestHeaders(
            mapOf(
                "Idempotency-Key" to HeaderParameterSpec(idempotencyKey, "simple", false, null),
            ),
            emptyMap()
        )
        val raw = client.post(ApiPaths.backendPath("/service_providers/pricing/rules"), body, null, requestHeaders, "application/json")
        return client.convertValue(raw, object : TypeReference<PricingRulesCreateResult>() {})
    }

    /** Service Provider Pricing Rule Update */
    suspend fun pricingRulesUpdate(ruleId: String, body: ServiceProviderPricingRuleUpdateRequest, idempotencyKey: String): PricingRulesUpdateResult? {
        val requestHeaders = buildRequestHeaders(
            mapOf(
                "Idempotency-Key" to HeaderParameterSpec(idempotencyKey, "simple", false, null),
            ),
            emptyMap()
        )
        val raw = client.patch(ApiPaths.backendPath("/service_providers/pricing/rules/${serializePathParameter(ruleId, PathParameterSpec("ruleId", "simple", false))}"), body, null, requestHeaders, "application/json")
        return client.convertValue(raw, object : TypeReference<PricingRulesUpdateResult>() {})
    }

    /** Service Provider Price Simulation Create */
    suspend fun priceSimulationCreate(body: ServiceProviderPriceSimulationRequest, idempotencyKey: String): PriceSimulationCreateResult? {
        val requestHeaders = buildRequestHeaders(
            mapOf(
                "Idempotency-Key" to HeaderParameterSpec(idempotencyKey, "simple", false, null),
            ),
            emptyMap()
        )
        val raw = client.post(ApiPaths.backendPath("/service_providers/pricing/simulations"), body, null, requestHeaders, "application/json")
        return client.convertValue(raw, object : TypeReference<PriceSimulationCreateResult>() {})
    }

    /** Service Providers List */
    suspend fun providerRegistryList(page: String? = null, pageSize: String? = null, status: String? = null, providerId: String? = null, sellerProviderId: String? = null, buyerProviderId: String? = null, edgeId: String? = null): ProviderRegistryListResult? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("page", page, "form", true, false, null),
            QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            QueryParameterSpec("status", status, "form", true, false, null),
            QueryParameterSpec("provider_id", providerId, "form", true, false, null),
            QueryParameterSpec("seller_provider_id", sellerProviderId, "form", true, false, null),
            QueryParameterSpec("buyer_provider_id", buyerProviderId, "form", true, false, null),
            QueryParameterSpec("edge_id", edgeId, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/service_providers/providers"), query))
        return client.convertValue(raw, object : TypeReference<ProviderRegistryListResult>() {})
    }

    /** Service Provider Reconciliation Runs List */
    suspend fun reconciliationRunsList(page: String? = null, pageSize: String? = null, status: String? = null, providerId: String? = null, sellerProviderId: String? = null, buyerProviderId: String? = null, edgeId: String? = null): ReconciliationRunsListResult? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("page", page, "form", true, false, null),
            QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            QueryParameterSpec("status", status, "form", true, false, null),
            QueryParameterSpec("provider_id", providerId, "form", true, false, null),
            QueryParameterSpec("seller_provider_id", sellerProviderId, "form", true, false, null),
            QueryParameterSpec("buyer_provider_id", buyerProviderId, "form", true, false, null),
            QueryParameterSpec("edge_id", edgeId, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/service_providers/reconciliation_runs"), query))
        return client.convertValue(raw, object : TypeReference<ReconciliationRunsListResult>() {})
    }

    /** Service Provider Relations List */
    suspend fun relationsList(page: String? = null, pageSize: String? = null, status: String? = null, providerId: String? = null, sellerProviderId: String? = null, buyerProviderId: String? = null, edgeId: String? = null): RelationsListResult? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("page", page, "form", true, false, null),
            QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            QueryParameterSpec("status", status, "form", true, false, null),
            QueryParameterSpec("provider_id", providerId, "form", true, false, null),
            QueryParameterSpec("seller_provider_id", sellerProviderId, "form", true, false, null),
            QueryParameterSpec("buyer_provider_id", buyerProviderId, "form", true, false, null),
            QueryParameterSpec("edge_id", edgeId, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/service_providers/relations"), query))
        return client.convertValue(raw, object : TypeReference<RelationsListResult>() {})
    }

    /** Service Provider Risk Events List */
    suspend fun riskEventsList(page: String? = null, pageSize: String? = null, status: String? = null, providerId: String? = null, sellerProviderId: String? = null, buyerProviderId: String? = null, edgeId: String? = null): RiskEventsListResult? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("page", page, "form", true, false, null),
            QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            QueryParameterSpec("status", status, "form", true, false, null),
            QueryParameterSpec("provider_id", providerId, "form", true, false, null),
            QueryParameterSpec("seller_provider_id", sellerProviderId, "form", true, false, null),
            QueryParameterSpec("buyer_provider_id", buyerProviderId, "form", true, false, null),
            QueryParameterSpec("edge_id", edgeId, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/service_providers/risk/events"), query))
        return client.convertValue(raw, object : TypeReference<RiskEventsListResult>() {})
    }

    /** Service Provider Statements List */
    suspend fun statementsList(page: String? = null, pageSize: String? = null, status: String? = null, providerId: String? = null, sellerProviderId: String? = null, buyerProviderId: String? = null, edgeId: String? = null): StatementsListResult? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("page", page, "form", true, false, null),
            QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            QueryParameterSpec("status", status, "form", true, false, null),
            QueryParameterSpec("provider_id", providerId, "form", true, false, null),
            QueryParameterSpec("seller_provider_id", sellerProviderId, "form", true, false, null),
            QueryParameterSpec("buyer_provider_id", buyerProviderId, "form", true, false, null),
            QueryParameterSpec("edge_id", edgeId, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/service_providers/statements"), query))
        return client.convertValue(raw, object : TypeReference<StatementsListResult>() {})
    }

    /** Service Provider Usage List */
    suspend fun usageList(page: String? = null, pageSize: String? = null, status: String? = null, providerId: String? = null, sellerProviderId: String? = null, buyerProviderId: String? = null, edgeId: String? = null): UsageListResult? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("page", page, "form", true, false, null),
            QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            QueryParameterSpec("status", status, "form", true, false, null),
            QueryParameterSpec("provider_id", providerId, "form", true, false, null),
            QueryParameterSpec("seller_provider_id", sellerProviderId, "form", true, false, null),
            QueryParameterSpec("buyer_provider_id", buyerProviderId, "form", true, false, null),
            QueryParameterSpec("edge_id", edgeId, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/service_providers/usage"), query))
        return client.convertValue(raw, object : TypeReference<UsageListResult>() {})
    }

    /** Service Provider Wallet Accounts List */
    suspend fun providerWalletAccountsList(page: String? = null, pageSize: String? = null, status: String? = null, providerId: String? = null, sellerProviderId: String? = null, buyerProviderId: String? = null, edgeId: String? = null): ProviderWalletAccountsListResult? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("page", page, "form", true, false, null),
            QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            QueryParameterSpec("status", status, "form", true, false, null),
            QueryParameterSpec("provider_id", providerId, "form", true, false, null),
            QueryParameterSpec("seller_provider_id", sellerProviderId, "form", true, false, null),
            QueryParameterSpec("buyer_provider_id", buyerProviderId, "form", true, false, null),
            QueryParameterSpec("edge_id", edgeId, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/service_providers/wallet/accounts"), query))
        return client.convertValue(raw, object : TypeReference<ProviderWalletAccountsListResult>() {})
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

    private data class HeaderParameterSpec(val value: Any?, val style: String, val explode: Boolean, val contentType: String?)

    private val headerObjectMapper = ObjectMapper().registerKotlinModule()

    private fun buildRequestHeaders(headers: Map<String, HeaderParameterSpec>, cookies: Map<String, HeaderParameterSpec>): Map<String, String>? {
        val requestHeaders = linkedMapOf<String, String>()
        headers.forEach { (name, parameter) ->
            serializeParameterValue(parameter)?.let { requestHeaders[name] = it }
        }

        val cookieHeader = buildCookieHeader(cookies)
        if (cookieHeader.isNotEmpty()) {
            requestHeaders["Cookie"] = requestHeaders["Cookie"]?.let { "$it; $cookieHeader" } ?: cookieHeader
        }

        return requestHeaders.takeIf { it.isNotEmpty() }
    }

    private fun buildCookieHeader(cookies: Map<String, HeaderParameterSpec>): String {
        return cookies.mapNotNull { (name, parameter) ->
            serializeParameterValue(parameter)?.let {
                java.net.URLEncoder.encode(name, java.nio.charset.StandardCharsets.UTF_8) + "=" +
                    java.net.URLEncoder.encode(it, java.nio.charset.StandardCharsets.UTF_8)
            }
        }.joinToString("; ")
    }

    private fun serializeParameterValue(parameter: HeaderParameterSpec?): String? {
        val value = parameter?.value ?: return null
        if (!parameter.contentType.isNullOrBlank()) {
            return headerObjectMapper.writeValueAsString(value)
        }
        return when (value) {
            is Iterable<*> -> value.mapNotNull { it?.toString() }.joinToString(",")
            is Map<*, *> -> value.mapNotNull { (key, item) ->
                if (item == null) {
                    null
                } else if (parameter.explode) {
                    "$key=$item"
                } else {
                    listOf(key.toString(), item.toString()).joinToString(",")
                }
            }.joinToString(",")
            else -> value.toString()
        }
    }
}
