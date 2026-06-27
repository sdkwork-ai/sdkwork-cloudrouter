package com.sdkwork.clawrouter.open.api

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import com.sdkwork.clawrouter.open.*
import com.sdkwork.clawrouter.open.http.HttpClient

class ChatAnthropicApi(private val client: HttpClient) {

    /** Anthropic Claude message */
    suspend fun createV1Message(body: AnthropicMessageCreateRequest): AnthropicMessage? {
        val raw = client.post(ApiPaths.aiPath("/anthropic/v1/messages"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<AnthropicMessage>() {})
    }

    /** Anthropic count message tokens */
    suspend fun createV1MessagesCountToken(body: AnthropicCountMessageTokensRequest): AnthropicCountMessageTokensResponse? {
        val raw = client.post(ApiPaths.aiPath("/anthropic/v1/messages/count_tokens"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<AnthropicCountMessageTokensResponse>() {})
    }



}
