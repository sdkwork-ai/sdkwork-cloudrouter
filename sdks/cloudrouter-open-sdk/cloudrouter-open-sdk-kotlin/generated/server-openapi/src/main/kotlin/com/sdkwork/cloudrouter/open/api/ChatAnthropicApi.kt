package com.sdkwork.cloudrouter.open.api

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import com.sdkwork.cloudrouter.open.*
import com.sdkwork.cloudrouter.open.http.HttpClient

class ChatAnthropicApi(private val client: HttpClient) {

    /** Anthropic Claude message */
    suspend fun createV1Message(body: AnthropicMessageCreateRequest, anthropicVersion: String): AnthropicMessage? {
        val requestHeaders = buildRequestHeaders(
            mapOf(
                "anthropic-version" to HeaderParameterSpec(anthropicVersion, "simple", false, null),
            ),
            emptyMap()
        )
        val raw = client.post("/anthropic/v1/messages", body, null, requestHeaders, "application/json")
        return client.convertValue(raw, object : TypeReference<AnthropicMessage>() {})
    }

    /** Anthropic count message tokens */
    suspend fun createV1MessagesCountToken(body: AnthropicCountMessageTokensRequest, anthropicVersion: String): AnthropicCountMessageTokensResponse? {
        val requestHeaders = buildRequestHeaders(
            mapOf(
                "anthropic-version" to HeaderParameterSpec(anthropicVersion, "simple", false, null),
            ),
            emptyMap()
        )
        val raw = client.post("/anthropic/v1/messages/count_tokens", body, null, requestHeaders, "application/json")
        return client.convertValue(raw, object : TypeReference<AnthropicCountMessageTokensResponse>() {})
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
