package com.sdkwork.cloudrouter.open.api

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import com.sdkwork.cloudrouter.open.*
import com.sdkwork.cloudrouter.open.http.HttpClient

class ImagesVolcengineApi(private val client: HttpClient) {

    /** Volcengine Ark image generation */
    suspend fun createApiV3ImagesGeneration(body: VolcengineImageGenerationRequest): VolcengineImageGenerationResponse? {
        val raw = client.post("/volcengine/api/v3/images/generations", body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<VolcengineImageGenerationResponse>() {})
    }



}
