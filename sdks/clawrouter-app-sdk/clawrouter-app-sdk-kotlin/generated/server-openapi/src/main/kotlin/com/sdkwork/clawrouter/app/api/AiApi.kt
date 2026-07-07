package com.sdkwork.clawrouter.app.api

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import com.sdkwork.clawrouter.app.*
import com.sdkwork.clawrouter.app.http.HttpClient

class AiApi(private val client: HttpClient) {

    /** List */
    suspend fun channelGroupsList(): ChannelGroupsListResult? {
        val raw = client.get(ApiPaths.appPath("/ai/channel_groups"))
        return client.convertValue(raw, object : TypeReference<ChannelGroupsListResult>() {})
    }

    /** Retrieve */
    suspend fun dashboardOverviewRetrieve(): DashboardOverviewRetrieveResult? {
        val raw = client.get(ApiPaths.appPath("/ai/dashboard/overview"))
        return client.convertValue(raw, object : TypeReference<DashboardOverviewRetrieveResult>() {})
    }

    /** List */
    suspend fun gatewayTracesList(): GatewayTracesListResult? {
        val raw = client.get(ApiPaths.appPath("/ai/gateway/traces"))
        return client.convertValue(raw, object : TypeReference<GatewayTracesListResult>() {})
    }

    /** List */
    suspend fun modelRankingsList(rankScope: String? = null, vendorCode: String? = null, modality: String? = null, q: String? = null, pageSize: Int? = null): ModelRankingsListResult? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("rank_scope", rankScope, "form", true, false, null),
            QueryParameterSpec("vendor_code", vendorCode, "form", true, false, null),
            QueryParameterSpec("modality", modality, "form", true, false, null),
            QueryParameterSpec("q", q, "form", true, false, null),
            QueryParameterSpec("page_size", pageSize, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/ai/model_rankings"), query))
        return client.convertValue(raw, object : TypeReference<ModelRankingsListResult>() {})
    }

    /** List */
    suspend fun modelVendorsList(): ModelVendorsListResult? {
        val raw = client.get(ApiPaths.appPath("/ai/model_vendors"))
        return client.convertValue(raw, object : TypeReference<ModelVendorsListResult>() {})
    }

    /** List */
    suspend fun modelsList(page: Int? = null, pageSize: Int? = null, q: String? = null, billingMeter: String? = null, vendorCodes: List<String>? = null, modalities: List<String>? = null, capabilities: List<String>? = null, categories: List<String>? = null, groups: List<String>? = null): ModelsListResult? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("page", page, "form", true, false, null),
            QueryParameterSpec("page_size", pageSize, "form", true, false, null),
            QueryParameterSpec("q", q, "form", true, false, null),
            QueryParameterSpec("billing_meter", billingMeter, "form", true, false, null),
            QueryParameterSpec("vendor_codes", vendorCodes, "form", false, false, null),
            QueryParameterSpec("modalities", modalities, "form", false, false, null),
            QueryParameterSpec("capabilities", capabilities, "form", false, false, null),
            QueryParameterSpec("categories", categories, "form", false, false, null),
            QueryParameterSpec("groups", groups, "form", false, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.appPath("/ai/models"), query))
        return client.convertValue(raw, object : TypeReference<ModelsListResult>() {})
    }

    /** List */
    suspend fun routingApiKeysList(): RoutingApiKeysListResult? {
        val raw = client.get(ApiPaths.appPath("/ai/routing/api_keys"))
        return client.convertValue(raw, object : TypeReference<RoutingApiKeysListResult>() {})
    }

    /** List */
    suspend fun routingChannelsList(): RoutingChannelsListResult? {
        val raw = client.get(ApiPaths.appPath("/ai/routing/channels"))
        return client.convertValue(raw, object : TypeReference<RoutingChannelsListResult>() {})
    }

    /** List */
    suspend fun routingRequestTracesList(): RoutingRequestTracesListResult? {
        val raw = client.get(ApiPaths.appPath("/ai/routing/request_traces"))
        return client.convertValue(raw, object : TypeReference<RoutingRequestTracesListResult>() {})
    }

    /** List */
    suspend fun routingUsageList(): RoutingUsageListResult? {
        val raw = client.get(ApiPaths.appPath("/ai/routing/usage"))
        return client.convertValue(raw, object : TypeReference<RoutingUsageListResult>() {})
    }

    /** List */
    suspend fun usageLogsList(): UsageLogsListResult? {
        val raw = client.get(ApiPaths.appPath("/ai/usage/logs"))
        return client.convertValue(raw, object : TypeReference<UsageLogsListResult>() {})
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
