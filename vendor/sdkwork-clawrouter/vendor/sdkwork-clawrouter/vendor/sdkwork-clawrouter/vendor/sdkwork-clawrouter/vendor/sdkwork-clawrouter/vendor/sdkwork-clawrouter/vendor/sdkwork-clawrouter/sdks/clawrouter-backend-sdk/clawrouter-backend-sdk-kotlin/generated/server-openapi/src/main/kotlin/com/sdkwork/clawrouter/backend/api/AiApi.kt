package com.sdkwork.clawrouter.backend.api

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import com.sdkwork.clawrouter.backend.*
import com.sdkwork.clawrouter.backend.http.HttpClient

class AiApi(private val client: HttpClient) {

    /** List groups */
    suspend fun channelGroupsList(): ChannelGroupsListResult? {
        val raw = client.get(ApiPaths.backendPath("/ai/channel_groups"))
        return client.convertValue(raw, object : TypeReference<ChannelGroupsListResult>() {})
    }

    /** Create group */
    suspend fun channelGroupsCreate(body: AdminChannelGroupCreateRequest): ChannelGroupsCreateResult? {
        val raw = client.post(ApiPaths.backendPath("/ai/channel_groups"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<ChannelGroupsCreateResult>() {})
    }

    /** Delete group */
    suspend fun channelGroupsDelete(channelGroupId: String): ChannelGroupsDeleteResult? {
        val raw = client.delete(ApiPaths.backendPath("/ai/channel_groups/${serializePathParameter(channelGroupId, PathParameterSpec("channelGroupId", "simple", false))}"))
        return client.convertValue(raw, object : TypeReference<ChannelGroupsDeleteResult>() {})
    }

    /** Update group */
    suspend fun channelGroupsUpdate(channelGroupId: String, body: AdminChannelGroupUpdateRequest): ChannelGroupsUpdateResult? {
        val raw = client.patch(ApiPaths.backendPath("/ai/channel_groups/${serializePathParameter(channelGroupId, PathParameterSpec("channelGroupId", "simple", false))}"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<ChannelGroupsUpdateResult>() {})
    }

    /** List group channel bindings */
    suspend fun channelGroupsBindingsList(channelGroupId: String): ChannelGroupsChannelBindingsListResult? {
        val raw = client.get(ApiPaths.backendPath("/ai/channel_groups/${serializePathParameter(channelGroupId, PathParameterSpec("channelGroupId", "simple", false))}/channel_bindings"))
        return client.convertValue(raw, object : TypeReference<ChannelGroupsChannelBindingsListResult>() {})
    }

    /** Replace group channel bindings */
    suspend fun channelGroupsBindingsUpdate(channelGroupId: String, body: AdminChannelGroupChannelBindingsReplaceRequest): ChannelGroupsChannelBindingsUpdateResult? {
        val raw = client.put(ApiPaths.backendPath("/ai/channel_groups/${serializePathParameter(channelGroupId, PathParameterSpec("channelGroupId", "simple", false))}/channel_bindings"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<ChannelGroupsChannelBindingsUpdateResult>() {})
    }

    /** List group route explain */
    suspend fun channelGroupsRouteExplainRetrieve(channelGroupId: String): ChannelGroupsRouteExplainRetrieveResult? {
        val raw = client.get(ApiPaths.backendPath("/ai/channel_groups/${serializePathParameter(channelGroupId, PathParameterSpec("channelGroupId", "simple", false))}/route_explain"))
        return client.convertValue(raw, object : TypeReference<ChannelGroupsRouteExplainRetrieveResult>() {})
    }

    /** List model mappings */
    suspend fun modelMappingsList(bindingType: String? = null, vendorCode: String? = null, channelId: String? = null, channelCode: String? = null, q: String? = null): ModelMappingsListResult? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("binding_type", bindingType, "form", true, false, null),
            QueryParameterSpec("vendor_code", vendorCode, "form", true, false, null),
            QueryParameterSpec("channel_id", channelId, "form", true, false, null),
            QueryParameterSpec("channel_code", channelCode, "form", true, false, null),
            QueryParameterSpec("q", q, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/ai/model_mappings"), query))
        return client.convertValue(raw, object : TypeReference<ModelMappingsListResult>() {})
    }

    /** Create model mapping */
    suspend fun modelMappingsCreate(body: AdminModelMappingCreateRequest): ModelMappingsCreateResult? {
        val raw = client.post(ApiPaths.backendPath("/ai/model_mappings"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<ModelMappingsCreateResult>() {})
    }

    /** Resolve model mapping */
    suspend fun modelMappingsResolveCreate(body: AdminModelMappingResolveRequest): ModelMappingsResolveCreateResult? {
        val raw = client.post(ApiPaths.backendPath("/ai/model_mappings/resolve"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<ModelMappingsResolveCreateResult>() {})
    }

    /** Delete model mapping */
    suspend fun modelMappingsDelete(mappingId: String): ModelMappingsDeleteResult? {
        val raw = client.delete(ApiPaths.backendPath("/ai/model_mappings/${serializePathParameter(mappingId, PathParameterSpec("mappingId", "simple", false))}"))
        return client.convertValue(raw, object : TypeReference<ModelMappingsDeleteResult>() {})
    }

    /** Update model mapping */
    suspend fun modelMappingsUpdate(mappingId: String, body: AdminModelMappingUpdateRequest): ModelMappingsUpdateResult? {
        val raw = client.patch(ApiPaths.backendPath("/ai/model_mappings/${serializePathParameter(mappingId, PathParameterSpec("mappingId", "simple", false))}"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<ModelMappingsUpdateResult>() {})
    }

    /** List model rankings */
    suspend fun modelRankingsList(rankScope: String? = null, vendorCode: String? = null, modality: String? = null, q: String? = null, limit: String? = null): ModelRankingsListResult? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("rank_scope", rankScope, "form", true, false, null),
            QueryParameterSpec("vendor_code", vendorCode, "form", true, false, null),
            QueryParameterSpec("modality", modality, "form", true, false, null),
            QueryParameterSpec("q", q, "form", true, false, null),
            QueryParameterSpec("limit", limit, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/ai/model_rankings"), query))
        return client.convertValue(raw, object : TypeReference<ModelRankingsListResult>() {})
    }

    /** List model ranking refresh jobs */
    suspend fun modelRankingsJobsList(rankScope: String? = null, limit: String? = null): ModelRankingsJobsListResult? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("rank_scope", rankScope, "form", true, false, null),
            QueryParameterSpec("limit", limit, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/ai/model_rankings/jobs"), query))
        return client.convertValue(raw, object : TypeReference<ModelRankingsJobsListResult>() {})
    }

    /** Trigger model ranking refresh */
    suspend fun modelRankingsRefresh(body: ModelRankingRefreshTriggerRequest): ModelRankingsRefreshResult? {
        val raw = client.post(ApiPaths.backendPath("/ai/model_rankings/refresh"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<ModelRankingsRefreshResult>() {})
    }

    /** List model ranking refresh status */
    suspend fun modelRankingsStatusRetrieve(rankScope: String? = null): ModelRankingsStatusRetrieveResult? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("rank_scope", rankScope, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/ai/model_rankings/status"), query))
        return client.convertValue(raw, object : TypeReference<ModelRankingsStatusRetrieveResult>() {})
    }

    /** List vendors */
    suspend fun modelVendorsList(): ModelVendorsListResult? {
        val raw = client.get(ApiPaths.backendPath("/ai/model_vendors"))
        return client.convertValue(raw, object : TypeReference<ModelVendorsListResult>() {})
    }

    /** Create vendor */
    suspend fun modelVendorsCreate(body: AdminModelVendorCreateRequest): ModelVendorsCreateResult? {
        val raw = client.post(ApiPaths.backendPath("/ai/model_vendors"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<ModelVendorsCreateResult>() {})
    }

    /** List models */
    suspend fun modelsList(): ModelsListResult? {
        val raw = client.get(ApiPaths.backendPath("/ai/models"))
        return client.convertValue(raw, object : TypeReference<ModelsListResult>() {})
    }

    /** Create model */
    suspend fun modelsCreate(body: AdminAiModelCreateRequest): ModelsCreateResult? {
        val raw = client.post(ApiPaths.backendPath("/ai/models"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<ModelsCreateResult>() {})
    }

    /** Sync vendors and models */
    suspend fun modelsRefresh(body: AdminModelCatalogSyncRequest): ModelsRefreshResult? {
        val raw = client.post(ApiPaths.backendPath("/ai/models/refresh"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<ModelsRefreshResult>() {})
    }

    /** Delete model */
    suspend fun modelsDelete(modelId: String): ModelsDeleteResult? {
        val raw = client.delete(ApiPaths.backendPath("/ai/models/${serializePathParameter(modelId, PathParameterSpec("modelId", "simple", false))}"))
        return client.convertValue(raw, object : TypeReference<ModelsDeleteResult>() {})
    }

    /** Update model */
    suspend fun modelsUpdate(modelId: String, body: AdminAiModelUpdateRequest): ModelsUpdateResult? {
        val raw = client.patch(ApiPaths.backendPath("/ai/models/${serializePathParameter(modelId, PathParameterSpec("modelId", "simple", false))}"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<ModelsUpdateResult>() {})
    }

    /** List resource groups */
    suspend fun getResourceGroupsList(): AiResourceGroupsListResult? {
        val raw = client.get(ApiPaths.backendPath("/ai/resource_groups"))
        return client.convertValue(raw, object : TypeReference<AiResourceGroupsListResult>() {})
    }

    /** Create resource group */
    suspend fun resourceGroupsCreate(body: AdminAiResourceGroupCreateRequest): AiResourceGroupsCreateResult? {
        val raw = client.post(ApiPaths.backendPath("/ai/resource_groups"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<AiResourceGroupsCreateResult>() {})
    }

    /** List resource group resources */
    suspend fun getResourceGroupsListResourceGroups(groupIdOrCode: String): AiResourceGroupsResourcesListResult? {
        val raw = client.get(ApiPaths.backendPath("/ai/resource_groups/${serializePathParameter(groupIdOrCode, PathParameterSpec("groupIdOrCode", "simple", false))}/resources"))
        return client.convertValue(raw, object : TypeReference<AiResourceGroupsResourcesListResult>() {})
    }

    /** Delete resource group */
    suspend fun resourceGroupsDelete(groupId: String): AiResourceGroupsDeleteResult? {
        val raw = client.delete(ApiPaths.backendPath("/ai/resource_groups/${serializePathParameter(groupId, PathParameterSpec("groupId", "simple", false))}"))
        return client.convertValue(raw, object : TypeReference<AiResourceGroupsDeleteResult>() {})
    }

    /** Update resource group */
    suspend fun resourceGroupsUpdate(groupId: String, body: AdminAiResourceGroupUpdateRequest): AiResourceGroupsUpdateResult? {
        val raw = client.patch(ApiPaths.backendPath("/ai/resource_groups/${serializePathParameter(groupId, PathParameterSpec("groupId", "simple", false))}"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<AiResourceGroupsUpdateResult>() {})
    }

    /** List ai resources */
    suspend fun resourcesList(): AiResourcesListResult? {
        val raw = client.get(ApiPaths.backendPath("/ai/resources"))
        return client.convertValue(raw, object : TypeReference<AiResourcesListResult>() {})
    }

    /** Create ai resource */
    suspend fun resourcesCreate(body: AdminAiResourceCreateRequest): AiResourcesCreateResult? {
        val raw = client.post(ApiPaths.backendPath("/ai/resources"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<AiResourcesCreateResult>() {})
    }

    /** Update ai resource */
    suspend fun resourcesUpdate(resourceId: String, body: AdminAiResourceUpdateRequest): AiResourcesUpdateResult? {
        val raw = client.put(ApiPaths.backendPath("/ai/resources/${serializePathParameter(resourceId, PathParameterSpec("resourceId", "simple", false))}"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<AiResourcesUpdateResult>() {})
    }

    /** List runtime route explain */
    suspend fun routeExplainCreate(body: AdminRuntimeRouteExplainRequest): RouteExplainCreateResult? {
        val raw = client.post(ApiPaths.backendPath("/ai/route_explain"), body, null, null, "application/json")
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
