package com.sdkwork.clawrouter.backend.api

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import com.sdkwork.clawrouter.backend.*
import com.sdkwork.clawrouter.backend.http.HttpClient

class SitesApi(private val client: HttpClient) {

    /** List */
    suspend fun siteCatalogList(): SiteCatalogListResult? {
        val raw = client.get(ApiPaths.backendPath("/sites"))
        return client.convertValue(raw, object : TypeReference<SiteCatalogListResult>() {})
    }

    /** Create */
    suspend fun siteCreate(): SiteCreateResult? {
        val raw = client.post(ApiPaths.backendPath("/sites"), null)
        return client.convertValue(raw, object : TypeReference<SiteCreateResult>() {})
    }

    /** Delete */
    suspend fun siteDelete(siteId: String): SiteDeleteResult? {
        val raw = client.delete(ApiPaths.backendPath("/sites/${serializePathParameter(siteId, PathParameterSpec("siteId", "simple", false))}"))
        return client.convertValue(raw, object : TypeReference<SiteDeleteResult>() {})
    }

    /** Update */
    suspend fun siteUpdate(siteId: String): SiteUpdateResult? {
        val raw = client.patch(ApiPaths.backendPath("/sites/${serializePathParameter(siteId, PathParameterSpec("siteId", "simple", false))}"), null)
        return client.convertValue(raw, object : TypeReference<SiteUpdateResult>() {})
    }

    /** List */
    suspend fun siteChannelsList(siteId: String): SiteChannelsListResult? {
        val raw = client.get(ApiPaths.backendPath("/sites/${serializePathParameter(siteId, PathParameterSpec("siteId", "simple", false))}/channels"))
        return client.convertValue(raw, object : TypeReference<SiteChannelsListResult>() {})
    }

    /** Create */
    suspend fun healthCheckCreate(siteId: String): HealthCheckCreateResult? {
        val raw = client.post(ApiPaths.backendPath("/sites/${serializePathParameter(siteId, PathParameterSpec("siteId", "simple", false))}/health_check"), null)
        return client.convertValue(raw, object : TypeReference<HealthCheckCreateResult>() {})
    }

    /** Create */
    suspend fun testConnectionCreate(siteId: String): TestConnectionCreateResult? {
        val raw = client.post(ApiPaths.backendPath("/sites/${serializePathParameter(siteId, PathParameterSpec("siteId", "simple", false))}/test_connection"), null)
        return client.convertValue(raw, object : TypeReference<TestConnectionCreateResult>() {})
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
