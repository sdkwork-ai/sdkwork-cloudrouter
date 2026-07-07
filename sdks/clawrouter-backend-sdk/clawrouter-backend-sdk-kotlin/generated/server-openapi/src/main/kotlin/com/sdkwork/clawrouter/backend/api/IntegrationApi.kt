package com.sdkwork.clawrouter.backend.api

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import com.sdkwork.clawrouter.backend.*
import com.sdkwork.clawrouter.backend.http.HttpClient

class IntegrationApi(private val client: HttpClient) {

    /** List */
    suspend fun channelsList(): ChannelsListResult? {
        val raw = client.get(ApiPaths.backendPath("/integration/channels"))
        return client.convertValue(raw, object : TypeReference<ChannelsListResult>() {})
    }

    /** Create */
    suspend fun channelsCreate(): ChannelsCreateResult? {
        val raw = client.post(ApiPaths.backendPath("/integration/channels"), null)
        return client.convertValue(raw, object : TypeReference<ChannelsCreateResult>() {})
    }

    /** Update */
    suspend fun channelsUpdate(): ChannelsUpdateResult? {
        val raw = client.put(ApiPaths.backendPath("/integration/channels"), null)
        return client.convertValue(raw, object : TypeReference<ChannelsUpdateResult>() {})
    }

    /** Delete */
    suspend fun channelsDelete(channelId: String): ChannelsDeleteResult? {
        val raw = client.delete(ApiPaths.backendPath("/integration/channels/${serializePathParameter(channelId, PathParameterSpec("channelId", "simple", false))}"))
        return client.convertValue(raw, object : TypeReference<ChannelsDeleteResult>() {})
    }

    /** Verify */
    suspend fun channelsVerify(channelId: String): ChannelsVerifyResult? {
        val raw = client.post(ApiPaths.backendPath("/integration/channels/${serializePathParameter(channelId, PathParameterSpec("channelId", "simple", false))}/verify"), null)
        return client.convertValue(raw, object : TypeReference<ChannelsVerifyResult>() {})
    }

    /** List */
    suspend fun providerSecretsList(): ProviderSecretsListResult? {
        val raw = client.get(ApiPaths.backendPath("/integration/provider_secrets"))
        return client.convertValue(raw, object : TypeReference<ProviderSecretsListResult>() {})
    }

    /** Create */
    suspend fun providerSecretsCreate(): ProviderSecretsCreateResult? {
        val raw = client.post(ApiPaths.backendPath("/integration/provider_secrets"), null)
        return client.convertValue(raw, object : TypeReference<ProviderSecretsCreateResult>() {})
    }

    /** Update */
    suspend fun providerSecretsUpdate(): ProviderSecretsUpdateResult? {
        val raw = client.put(ApiPaths.backendPath("/integration/provider_secrets"), null)
        return client.convertValue(raw, object : TypeReference<ProviderSecretsUpdateResult>() {})
    }

    /** Delete */
    suspend fun providerSecretsDelete(secretId: String): ProviderSecretsDeleteResult? {
        val raw = client.delete(ApiPaths.backendPath("/integration/provider_secrets/${serializePathParameter(secretId, PathParameterSpec("secretId", "simple", false))}"))
        return client.convertValue(raw, object : TypeReference<ProviderSecretsDeleteResult>() {})
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
