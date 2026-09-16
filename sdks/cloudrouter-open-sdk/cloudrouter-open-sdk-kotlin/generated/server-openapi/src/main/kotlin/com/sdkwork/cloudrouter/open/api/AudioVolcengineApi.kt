package com.sdkwork.cloudrouter.open.api

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import com.sdkwork.cloudrouter.open.*
import com.sdkwork.cloudrouter.open.http.HttpClient

class AudioVolcengineApi(private val client: HttpClient) {

    /** Volcengine create speech */
    suspend fun createApiV3AudioSpeech(body: OpenAiSpeechCreateRequest): String? {
        val raw = client.post(ApiPaths.aiPath("/volcengine/api/v3/audio/speech"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<String>() {})
    }



}
