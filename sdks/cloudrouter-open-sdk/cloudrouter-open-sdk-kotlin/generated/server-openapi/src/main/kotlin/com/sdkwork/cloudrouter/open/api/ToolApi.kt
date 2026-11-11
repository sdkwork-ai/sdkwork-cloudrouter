package com.sdkwork.cloudrouter.open.api

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import com.sdkwork.cloudrouter.open.*
import com.sdkwork.cloudrouter.open.http.HttpClient

class ToolApi(private val client: HttpClient) {

    /** Fetch a web page */
    suspend fun createFetch(body: OpenAiDeepSeekWebFetchRequest): OpenAiDeepSeekWebFetchResponse? {
        val raw = client.post(ApiPaths.aiPath("/tools/fetch"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<OpenAiDeepSeekWebFetchResponse>() {})
    }

    /** Search the web */
    suspend fun search(body: OpenAiDeepSeekWebSearchRequest): OpenAiDeepSeekWebSearchResponse? {
        val raw = client.post(ApiPaths.aiPath("/tools/search"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<OpenAiDeepSeekWebSearchResponse>() {})
    }



}
