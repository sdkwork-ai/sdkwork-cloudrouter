package com.sdkwork.clawrouter.open.api

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import com.sdkwork.clawrouter.open.*
import com.sdkwork.clawrouter.open.http.HttpClient

class RealtimeApi(private val client: HttpClient) {

    /** Create realtime call */
    suspend fun createCall(body: OpenAiRealtimeCallCreateRequest): String? {
        val raw = client.post(ApiPaths.aiPath("/realtime/calls"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<String>() {})
    }

    /** Accept realtime call */
    suspend fun createCallsAccept(callId: String, body: OpenAiRealtimeCallActionRequest): OpenAiRealtimeCall? {
        val raw = client.post(ApiPaths.aiPath("/realtime/calls/${serializePathParameter(callId, PathParameterSpec("call_id", "simple", false))}/accept"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<OpenAiRealtimeCall>() {})
    }

    /** Hang up realtime call */
    suspend fun createCallsHangup(callId: String, body: OpenAiRealtimeCallActionRequest): OpenAiRealtimeCall? {
        val raw = client.post(ApiPaths.aiPath("/realtime/calls/${serializePathParameter(callId, PathParameterSpec("call_id", "simple", false))}/hangup"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<OpenAiRealtimeCall>() {})
    }

    /** Refer realtime call */
    suspend fun createCallsRefer(callId: String, body: OpenAiRealtimeCallReferRequest): OpenAiRealtimeCall? {
        val raw = client.post(ApiPaths.aiPath("/realtime/calls/${serializePathParameter(callId, PathParameterSpec("call_id", "simple", false))}/refer"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<OpenAiRealtimeCall>() {})
    }

    /** Reject realtime call */
    suspend fun createCallsReject(callId: String, body: OpenAiRealtimeCallActionRequest): OpenAiRealtimeCall? {
        val raw = client.post(ApiPaths.aiPath("/realtime/calls/${serializePathParameter(callId, PathParameterSpec("call_id", "simple", false))}/reject"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<OpenAiRealtimeCall>() {})
    }

    /** Create realtime client secret */
    suspend fun createClientSecret(body: OpenAiRealtimeClientSecretCreateRequest): OpenAiRealtimeClientSecret? {
        val raw = client.post(ApiPaths.aiPath("/realtime/client_secrets"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<OpenAiRealtimeClientSecret>() {})
    }

    /** Create realtime session */
    suspend fun createSession(body: OpenAiRealtimeSessionCreateRequest): OpenAiRealtimeSession? {
        val raw = client.post(ApiPaths.aiPath("/realtime/sessions"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<OpenAiRealtimeSession>() {})
    }

    /** Create realtime transcription session */
    suspend fun createTranscriptionSession(body: OpenAiRealtimeTranscriptionSessionCreateRequest): OpenAiRealtimeTranscriptionSession? {
        val raw = client.post(ApiPaths.aiPath("/realtime/transcription_sessions"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<OpenAiRealtimeTranscriptionSession>() {})
    }

    /** Create realtime translation session */
    suspend fun createTranslation(body: OpenAiRealtimeTranslationSessionCreateRequest): OpenAiRealtimeTranslationSession? {
        val raw = client.post(ApiPaths.aiPath("/realtime/translations"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<OpenAiRealtimeTranslationSession>() {})
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
