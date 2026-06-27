package com.sdkwork.clawrouter.open.api

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import com.sdkwork.clawrouter.open.*
import com.sdkwork.clawrouter.open.http.HttpClient

class CompletionApi(private val client: HttpClient) {

    /** Create completion */
    suspend fun create(body: OpenAiCompletionCreateRequest): OpenAiCompletion? {
        val raw = client.post(ApiPaths.aiPath("/completions"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<OpenAiCompletion>() {})
    }



}
