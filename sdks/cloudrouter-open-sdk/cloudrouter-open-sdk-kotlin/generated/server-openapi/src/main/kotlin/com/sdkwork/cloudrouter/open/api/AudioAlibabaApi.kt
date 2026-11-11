package com.sdkwork.cloudrouter.open.api

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import com.sdkwork.cloudrouter.open.*
import com.sdkwork.cloudrouter.open.http.HttpClient

class AudioAlibabaApi(private val client: HttpClient) {

    /** Alibaba Qwen TTS speech synthesis */
    suspend fun createApiV1ServicesAudioTtsSpeechSynthesizer(body: AlibabaSpeechRequest): AlibabaSpeechResponse? {
        val raw = client.post("/alibaba/api/v1/services/audio/tts/SpeechSynthesizer", body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<AlibabaSpeechResponse>() {})
    }



}
