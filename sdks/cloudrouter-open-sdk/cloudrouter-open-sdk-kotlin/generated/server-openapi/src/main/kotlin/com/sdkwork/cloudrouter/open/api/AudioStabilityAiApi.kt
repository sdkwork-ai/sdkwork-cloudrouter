package com.sdkwork.cloudrouter.open.api

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import com.sdkwork.cloudrouter.open.*
import com.sdkwork.cloudrouter.open.http.HttpClient

class AudioStabilityAiApi(private val client: HttpClient) {

    /** Stability AI text-to-audio (music and sound effects) */
    suspend fun createTextToAudio(body: StabilityAudioRequest): String? {
        val raw = client.post("/stability_ai/v2beta/audio/stable-audio-2/text-to-audio", body, null, null, "multipart/form-data")
        return client.convertValue(raw, object : TypeReference<String>() {})
    }



}
