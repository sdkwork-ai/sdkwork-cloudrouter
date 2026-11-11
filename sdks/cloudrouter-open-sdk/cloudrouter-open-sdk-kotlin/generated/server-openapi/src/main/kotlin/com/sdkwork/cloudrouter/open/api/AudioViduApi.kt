package com.sdkwork.cloudrouter.open.api

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import com.sdkwork.cloudrouter.open.*
import com.sdkwork.cloudrouter.open.http.HttpClient

class AudioViduApi(private val client: HttpClient) {

    /** Vidu text to audio */
    suspend fun createEntV2Text2audio(body: ViduTextToAudioRequest): ViduAudioGenerationTask? {
        val raw = client.post("/vidu/ent/v2/text2audio", body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<ViduAudioGenerationTask>() {})
    }

    /** Vidu timing to audio */
    suspend fun createEntV2Timing2audio(body: ViduTimingToAudioRequest): ViduAudioGenerationTask? {
        val raw = client.post("/vidu/ent/v2/timing2audio", body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<ViduAudioGenerationTask>() {})
    }



}
