package com.sdkwork.cloudrouter.open.api

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import com.sdkwork.cloudrouter.open.*
import com.sdkwork.cloudrouter.open.http.HttpClient

class VideosBlackForestLabsApi(private val client: HttpClient) {

    /** Black Forest Labs FLUX 3 video generation */
    suspend fun createFlux3Video(body: BlackForestLabsVideoGenerationRequest): BlackForestLabsVideoGenerationTask? {
        val raw = client.post("/black_forest_labs/v1/flux-3-video", body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<BlackForestLabsVideoGenerationTask>() {})
    }



}
