package com.sdkwork.clawrouter.backend.api

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import com.sdkwork.clawrouter.backend.*
import com.sdkwork.clawrouter.backend.http.HttpClient

class AiApi(private val client: HttpClient) {

    /** List */
    suspend fun channelGroupsList(): ChannelGroupsListResult? {
        val raw = client.get(ApiPaths.backendPath("/ai/channel_groups"))
        return client.convertValue(raw, object : TypeReference<ChannelGroupsListResult>() {})
    }

    /** Create */
    suspend fun channelGroupsCreate(): ChannelGroupsCreateResult? {
        val raw = client.post(ApiPaths.backendPath("/ai/channel_groups"), null)
        return client.convertValue(raw, object : TypeReference<ChannelGroupsCreateResult>() {})
    }

    /** Delete */
    suspend fun channelGroupsDelete(channelGroupId: String): ChannelGroupsDeleteResult? {
        val raw = client.delete(ApiPaths.backendPath("/ai/channel_groups/${serializePathParameter(channelGroupId, PathParameterSpec("channelGroupId", "simple", false))}"))
        return client.convertValue(raw, object : TypeReference<ChannelGroupsDeleteResult>() {})
    }

    /** Update */
    suspend fun channelGroupsUpdate(channelGroupId: String): ChannelGroupsUpdateResult? {
        val raw = client.patch(ApiPaths.backendPath("/ai/channel_groups/${serializePathParameter(channelGroupId, PathParameterSpec("channelGroupId", "simple", false))}"), null)
        return client.convertValue(raw, object : TypeReference<ChannelGroupsUpdateResult>() {})
    }

    /** List */
    suspend fun channelGroupsBindingsList(channelGroupId: String): ChannelGroupsChannelBindingsListResult? {
        val raw = client.get(ApiPaths.backendPath("/ai/channel_groups/${serializePathParameter(channelGroupId, PathParameterSpec("channelGroupId", "simple", false))}/channel_bindings"))
        return client.convertValue(raw, object : TypeReference<ChannelGroupsChannelBindingsListResult>() {})
    }

    /** Update */
    suspend fun channelGroupsBindingsUpdate(channelGroupId: String): ChannelGroupsChannelBindingsUpdateResult? {
        val raw = client.put(ApiPaths.backendPath("/ai/channel_groups/${serializePathParameter(channelGroupId, PathParameterSpec("channelGroupId", "simple", false))}/channel_bindings"), null)
        return client.convertValue(raw, object : TypeReference<ChannelGroupsChannelBindingsUpdateResult>() {})
    }

    /** Retrieve */
    suspend fun channelGroupsRouteExplainRetrieve(channelGroupId: String): ChannelGroupsRouteExplainRetrieveResult? {
        val raw = client.get(ApiPaths.backendPath("/ai/channel_groups/${serializePathParameter(channelGroupId, PathParameterSpec("channelGroupId", "simple", false))}/route_explain"))
        return client.convertValue(raw, object : TypeReference<ChannelGroupsRouteExplainRetrieveResult>() {})
    }

    /** List */
    suspend fun modelMappingOptionsList(): ModelMappingOptionsListResult? {
        val raw = client.get(ApiPaths.backendPath("/ai/model_mapping_options"))
        return client.convertValue(raw, object : TypeReference<ModelMappingOptionsListResult>() {})
    }

    /** List */
    suspend fun modelMappingsList(): ModelMappingsListResult? {
        val raw = client.get(ApiPaths.backendPath("/ai/model_mappings"))
        return client.convertValue(raw, object : TypeReference<ModelMappingsListResult>() {})
    }

    /** Create */
    suspend fun modelMappingsCreate(): ModelMappingsCreateResult? {
        val raw = client.post(ApiPaths.backendPath("/ai/model_mappings"), null)
        return client.convertValue(raw, object : TypeReference<ModelMappingsCreateResult>() {})
    }

    /** Replace */
    suspend fun modelMappingsReplace(): ModelMappingsReplaceResult? {
        val raw = client.put(ApiPaths.backendPath("/ai/model_mappings"), null)
        return client.convertValue(raw, object : TypeReference<ModelMappingsReplaceResult>() {})
    }

    /** Create */
    suspend fun modelMappingsResolveCreate(): ModelMappingsResolveCreateResult? {
        val raw = client.post(ApiPaths.backendPath("/ai/model_mappings/resolve"), null)
        return client.convertValue(raw, object : TypeReference<ModelMappingsResolveCreateResult>() {})
    }

    /** Delete */
    suspend fun modelMappingsDelete(mappingId: String): ModelMappingsDeleteResult? {
        val raw = client.delete(ApiPaths.backendPath("/ai/model_mappings/${serializePathParameter(mappingId, PathParameterSpec("mappingId", "simple", false))}"))
        return client.convertValue(raw, object : TypeReference<ModelMappingsDeleteResult>() {})
    }

    /** Update */
    suspend fun modelMappingsUpdate(mappingId: String): ModelMappingsUpdateResult? {
        val raw = client.patch(ApiPaths.backendPath("/ai/model_mappings/${serializePathParameter(mappingId, PathParameterSpec("mappingId", "simple", false))}"), null)
        return client.convertValue(raw, object : TypeReference<ModelMappingsUpdateResult>() {})
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
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/ai/model_rankings"), query))
        return client.convertValue(raw, object : TypeReference<ModelRankingsListResult>() {})
    }

    /** List */
    suspend fun modelRankingsJobsList(rankScope: String? = null, pageSize: Int? = null): ModelRankingsJobsListResult? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("rank_scope", rankScope, "form", true, false, null),
            QueryParameterSpec("page_size", pageSize, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/ai/model_rankings/jobs"), query))
        return client.convertValue(raw, object : TypeReference<ModelRankingsJobsListResult>() {})
    }

    /** Refresh */
    suspend fun modelRankingsRefresh(): ModelRankingsRefreshResult? {
        val raw = client.post(ApiPaths.backendPath("/ai/model_rankings/refresh"), null)
        return client.convertValue(raw, object : TypeReference<ModelRankingsRefreshResult>() {})
    }

    /** Retrieve */
    suspend fun modelRankingsStatusRetrieve(page: Int? = null, pageSize: Int? = null, q: String? = null, billingMeter: String? = null, vendorCodes: List<String>? = null, modalities: List<String>? = null, capabilities: List<String>? = null, categories: List<String>? = null, groups: List<String>? = null): ModelRankingsStatusRetrieveResult? {
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
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/ai/model_rankings/status"), query))
        return client.convertValue(raw, object : TypeReference<ModelRankingsStatusRetrieveResult>() {})
    }

    /** List */
    suspend fun modelVendorsList(): ModelVendorsListResult? {
        val raw = client.get(ApiPaths.backendPath("/ai/model_vendors"))
        return client.convertValue(raw, object : TypeReference<ModelVendorsListResult>() {})
    }

    /** Create */
    suspend fun modelVendorsCreate(): ModelVendorsCreateResult? {
        val raw = client.post(ApiPaths.backendPath("/ai/model_vendors"), null)
        return client.convertValue(raw, object : TypeReference<ModelVendorsCreateResult>() {})
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
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/ai/models"), query))
        return client.convertValue(raw, object : TypeReference<ModelsListResult>() {})
    }

    /** Create */
    suspend fun modelsCreate(): ModelsCreateResult? {
        val raw = client.post(ApiPaths.backendPath("/ai/models"), null)
        return client.convertValue(raw, object : TypeReference<ModelsCreateResult>() {})
    }

    /** Refresh */
    suspend fun modelsRefresh(): ModelsRefreshResult? {
        val raw = client.post(ApiPaths.backendPath("/ai/models/refresh"), null)
        return client.convertValue(raw, object : TypeReference<ModelsRefreshResult>() {})
    }

    /** Delete */
    suspend fun modelsDelete(modelId: String): ModelsDeleteResult? {
        val raw = client.delete(ApiPaths.backendPath("/ai/models/${serializePathParameter(modelId, PathParameterSpec("modelId", "simple", false))}"))
        return client.convertValue(raw, object : TypeReference<ModelsDeleteResult>() {})
    }

    /** Update */
    suspend fun modelsUpdate(modelId: String): ModelsUpdateResult? {
        val raw = client.patch(ApiPaths.backendPath("/ai/models/${serializePathParameter(modelId, PathParameterSpec("modelId", "simple", false))}"), null)
        return client.convertValue(raw, object : TypeReference<ModelsUpdateResult>() {})
    }

    /** List */
    suspend fun getResourceGroupsList(): AiResourceGroupsListResult? {
        val raw = client.get(ApiPaths.backendPath("/ai/resource_groups"))
        return client.convertValue(raw, object : TypeReference<AiResourceGroupsListResult>() {})
    }

    /** Create */
    suspend fun resourceGroupsCreate(): AiResourceGroupsCreateResult? {
        val raw = client.post(ApiPaths.backendPath("/ai/resource_groups"), null)
        return client.convertValue(raw, object : TypeReference<AiResourceGroupsCreateResult>() {})
    }

    /** List */
    suspend fun getResourceGroupsListResourceGroups(groupIdOrCode: String): AiResourceGroupsResourcesListResult? {
        val raw = client.get(ApiPaths.backendPath("/ai/resource_groups/${serializePathParameter(groupIdOrCode, PathParameterSpec("groupIdOrCode", "simple", false))}/resources"))
        return client.convertValue(raw, object : TypeReference<AiResourceGroupsResourcesListResult>() {})
    }

    /** Delete */
    suspend fun resourceGroupsDelete(groupId: String): AiResourceGroupsDeleteResult? {
        val raw = client.delete(ApiPaths.backendPath("/ai/resource_groups/${serializePathParameter(groupId, PathParameterSpec("groupId", "simple", false))}"))
        return client.convertValue(raw, object : TypeReference<AiResourceGroupsDeleteResult>() {})
    }

    /** Update */
    suspend fun resourceGroupsUpdate(groupId: String): AiResourceGroupsUpdateResult? {
        val raw = client.patch(ApiPaths.backendPath("/ai/resource_groups/${serializePathParameter(groupId, PathParameterSpec("groupId", "simple", false))}"), null)
        return client.convertValue(raw, object : TypeReference<AiResourceGroupsUpdateResult>() {})
    }

    /** List */
    suspend fun resourcesList(): AiResourcesListResult? {
        val raw = client.get(ApiPaths.backendPath("/ai/resources"))
        return client.convertValue(raw, object : TypeReference<AiResourcesListResult>() {})
    }

    /** Create */
    suspend fun resourcesCreate(): AiResourcesCreateResult? {
        val raw = client.post(ApiPaths.backendPath("/ai/resources"), null)
        return client.convertValue(raw, object : TypeReference<AiResourcesCreateResult>() {})
    }

    /** Update */
    suspend fun resourcesUpdate(resourceId: String): AiResourcesUpdateResult? {
        val raw = client.put(ApiPaths.backendPath("/ai/resources/${serializePathParameter(resourceId, PathParameterSpec("resourceId", "simple", false))}"), null)
        return client.convertValue(raw, object : TypeReference<AiResourcesUpdateResult>() {})
    }

    /** Create */
    suspend fun routeExplainCreate(): RouteExplainCreateResult? {
        val raw = client.post(ApiPaths.backendPath("/ai/route_explain"), null)
        return client.convertValue(raw, object : TypeReference<RouteExplainCreateResult>() {})
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
