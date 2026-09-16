package com.sdkwork.cloudrouter.open.api

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import com.sdkwork.cloudrouter.open.*
import com.sdkwork.cloudrouter.open.http.HttpClient

class AudioMinimaxApi(private val client: HttpClient) {

    /** Minimax create music generation */
    suspend fun createV1MusicGeneration(body: MiniMaxMusicGenerationRequest): MiniMaxMusicGenerationResponse? {
        val raw = client.post("/minimax/v1/music_generation", body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<MiniMaxMusicGenerationResponse>() {})
    }



}
