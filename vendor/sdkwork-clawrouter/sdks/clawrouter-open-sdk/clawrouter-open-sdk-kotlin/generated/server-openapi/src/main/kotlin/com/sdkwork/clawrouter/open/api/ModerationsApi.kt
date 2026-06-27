package com.sdkwork.clawrouter.open.api

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import com.sdkwork.clawrouter.open.*
import com.sdkwork.clawrouter.open.http.HttpClient

class ModerationsApi(private val client: HttpClient) {

    /** Create moderation */
    suspend fun create(body: OpenAiModerationCreateRequest): OpenAiModeration? {
        val raw = client.post(ApiPaths.aiPath("/moderations"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<OpenAiModeration>() {})
    }



}
