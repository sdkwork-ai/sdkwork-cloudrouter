package com.sdkwork.cloudrouter.open.api

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import com.sdkwork.cloudrouter.open.*
import com.sdkwork.cloudrouter.open.http.HttpClient

class ImagesMinimaxApi(private val client: HttpClient) {

    /** MiniMax image generation */
    suspend fun createV1ImageGeneration(body: MinimaxImageGenerationRequest): MinimaxImageGenerationResponse? {
        val raw = client.post("/minimax/v1/image_generation", body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<MinimaxImageGenerationResponse>() {})
    }



}
