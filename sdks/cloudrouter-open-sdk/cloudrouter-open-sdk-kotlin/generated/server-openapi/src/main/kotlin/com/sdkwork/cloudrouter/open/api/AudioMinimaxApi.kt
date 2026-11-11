package com.sdkwork.cloudrouter.open.api

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import com.sdkwork.cloudrouter.open.*
import com.sdkwork.cloudrouter.open.http.HttpClient

class AudioMinimaxApi(private val client: HttpClient) {

    /** MiniMax speech synthesis */
    suspend fun createV1T2aV(body: MinimaxTextToSpeechRequest): MinimaxTextToSpeechResponse? {
        val raw = client.post("/minimax/v1/t2a_v2", body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<MinimaxTextToSpeechResponse>() {})
    }



}
