package com.sdkwork.clawrouter.app.api

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import com.sdkwork.clawrouter.app.*
import com.sdkwork.clawrouter.app.http.HttpClient

class ChatApi(private val client: HttpClient) {

    /** List */
    suspend fun conversationsList(): ConversationsListResult? {
        val raw = client.get(ApiPaths.appPath("/chat/conversations"))
        return client.convertValue(raw, object : TypeReference<ConversationsListResult>() {})
    }

    /** Create */
    suspend fun conversationsCreate(): ConversationsCreateResult? {
        val raw = client.post(ApiPaths.appPath("/chat/conversations"), null)
        return client.convertValue(raw, object : TypeReference<ConversationsCreateResult>() {})
    }

    /** Retrieve */
    suspend fun conversationsRetrieve(conversationId: String): ConversationsRetrieveResult? {
        val raw = client.get(ApiPaths.appPath("/chat/conversations/${serializePathParameter(conversationId, PathParameterSpec("conversationId", "simple", false))}"))
        return client.convertValue(raw, object : TypeReference<ConversationsRetrieveResult>() {})
    }

    /** List */
    suspend fun conversationMessagesList(conversationId: String): ConversationMessagesListResult? {
        val raw = client.get(ApiPaths.appPath("/chat/conversations/${serializePathParameter(conversationId, PathParameterSpec("conversationId", "simple", false))}/messages"))
        return client.convertValue(raw, object : TypeReference<ConversationMessagesListResult>() {})
    }

    /** Create */
    suspend fun turnsCreate(conversationId: String): TurnsCreateResult? {
        val raw = client.post(ApiPaths.appPath("/chat/conversations/${serializePathParameter(conversationId, PathParameterSpec("conversationId", "simple", false))}/turns"), null)
        return client.convertValue(raw, object : TypeReference<TurnsCreateResult>() {})
    }

    /** Create */
    suspend fun turnResponsesCreate(conversationId: String, turnId: String): TurnResponsesCreateResult? {
        val raw = client.post(ApiPaths.appPath("/chat/conversations/${serializePathParameter(conversationId, PathParameterSpec("conversationId", "simple", false))}/turns/${serializePathParameter(turnId, PathParameterSpec("turnId", "simple", false))}/response"), null)
        return client.convertValue(raw, object : TypeReference<TurnResponsesCreateResult>() {})
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
