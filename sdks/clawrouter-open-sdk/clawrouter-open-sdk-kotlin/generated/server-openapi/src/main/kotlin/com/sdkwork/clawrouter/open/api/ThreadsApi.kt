package com.sdkwork.clawrouter.open.api

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import com.sdkwork.clawrouter.open.*
import com.sdkwork.clawrouter.open.http.HttpClient

class ThreadsApi(private val client: HttpClient) {

    /** Create thread */
    suspend fun create(body: OpenAiThreadCreateRequest): OpenAiThread? {
        val raw = client.post(ApiPaths.aiPath("/threads"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<OpenAiThread>() {})
    }

    /** Create thread and run */
    suspend fun createRun(body: OpenAiThreadAndRunCreateRequest): OpenAiRun? {
        val raw = client.post(ApiPaths.aiPath("/threads/runs"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<OpenAiRun>() {})
    }

    /** Delete thread */
    suspend fun delete(threadId: String): DeleteResult? {
        val raw = client.delete(ApiPaths.aiPath("/threads/${serializePathParameter(threadId, PathParameterSpec("thread_id", "simple", false))}"))
        return client.convertValue(raw, object : TypeReference<DeleteResult>() {})
    }

    /** Retrieve thread */
    suspend fun retrieve(threadId: String): OpenAiThread? {
        val raw = client.get(ApiPaths.aiPath("/threads/${serializePathParameter(threadId, PathParameterSpec("thread_id", "simple", false))}"))
        return client.convertValue(raw, object : TypeReference<OpenAiThread>() {})
    }

    /** Modify thread */
    suspend fun update(threadId: String, body: OpenAiThreadUpdateRequest): OpenAiThread? {
        val raw = client.post(ApiPaths.aiPath("/threads/${serializePathParameter(threadId, PathParameterSpec("thread_id", "simple", false))}"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<OpenAiThread>() {})
    }

    /** List thread messages */
    suspend fun listMessages(threadId: String, limit: Int? = null, order: String? = null, after: String? = null, before: String? = null): OpenAiThreadMessageList? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("limit", limit, "form", true, false, null),
            QueryParameterSpec("order", order, "form", true, false, null),
            QueryParameterSpec("after", after, "form", true, false, null),
            QueryParameterSpec("before", before, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/threads/${serializePathParameter(threadId, PathParameterSpec("thread_id", "simple", false))}/messages"), query))
        return client.convertValue(raw, object : TypeReference<OpenAiThreadMessageList>() {})
    }

    /** Create thread message */
    suspend fun createMessage(threadId: String, body: OpenAiThreadMessageCreateRequest): OpenAiThreadMessage? {
        val raw = client.post(ApiPaths.aiPath("/threads/${serializePathParameter(threadId, PathParameterSpec("thread_id", "simple", false))}/messages"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<OpenAiThreadMessage>() {})
    }

    /** Delete thread message */
    suspend fun deleteMessages(threadId: String, messageId: String): DeleteResult? {
        val raw = client.delete(ApiPaths.aiPath("/threads/${serializePathParameter(threadId, PathParameterSpec("thread_id", "simple", false))}/messages/${serializePathParameter(messageId, PathParameterSpec("message_id", "simple", false))}"))
        return client.convertValue(raw, object : TypeReference<DeleteResult>() {})
    }

    /** List thread runs */
    suspend fun listRuns(threadId: String, limit: Int? = null, order: String? = null, after: String? = null, before: String? = null): OpenAiRunList? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("limit", limit, "form", true, false, null),
            QueryParameterSpec("order", order, "form", true, false, null),
            QueryParameterSpec("after", after, "form", true, false, null),
            QueryParameterSpec("before", before, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/threads/${serializePathParameter(threadId, PathParameterSpec("thread_id", "simple", false))}/runs"), query))
        return client.convertValue(raw, object : TypeReference<OpenAiRunList>() {})
    }

    /** Cancel thread run */
    suspend fun createRunsCancel(threadId: String, runId: String): OpenAiRun? {
        val raw = client.post(ApiPaths.aiPath("/threads/${serializePathParameter(threadId, PathParameterSpec("thread_id", "simple", false))}/runs/${serializePathParameter(runId, PathParameterSpec("run_id", "simple", false))}/cancel"), null)
        return client.convertValue(raw, object : TypeReference<OpenAiRun>() {})
    }

    /** List run steps */
    suspend fun listRunsSteps(threadId: String, runId: String, limit: Int? = null, order: String? = null, after: String? = null, before: String? = null): OpenAiRunStepList? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("limit", limit, "form", true, false, null),
            QueryParameterSpec("order", order, "form", true, false, null),
            QueryParameterSpec("after", after, "form", true, false, null),
            QueryParameterSpec("before", before, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/threads/${serializePathParameter(threadId, PathParameterSpec("thread_id", "simple", false))}/runs/${serializePathParameter(runId, PathParameterSpec("run_id", "simple", false))}/steps"), query))
        return client.convertValue(raw, object : TypeReference<OpenAiRunStepList>() {})
    }

    /** Submit run tool outputs */
    suspend fun createRunsSubmitToolOutput(threadId: String, runId: String, body: OpenAiRunSubmitToolOutputsRequest): OpenAiRun? {
        val raw = client.post(ApiPaths.aiPath("/threads/${serializePathParameter(threadId, PathParameterSpec("thread_id", "simple", false))}/runs/${serializePathParameter(runId, PathParameterSpec("run_id", "simple", false))}/submit_tool_outputs"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<OpenAiRun>() {})
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
