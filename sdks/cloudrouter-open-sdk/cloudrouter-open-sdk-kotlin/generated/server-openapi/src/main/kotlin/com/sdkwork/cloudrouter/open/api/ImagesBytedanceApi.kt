package com.sdkwork.cloudrouter.open.api

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import com.sdkwork.cloudrouter.open.*
import com.sdkwork.cloudrouter.open.http.HttpClient

class ImagesBytedanceApi(private val client: HttpClient) {

    /** ByteDance Seedream image generation */
    suspend fun createApiV3ImagesGeneration(body: BytedanceImageGenerationRequest): BytedanceImageGenerationResponse? {
        val raw = client.post("/bytedance/api/v3/images/generations", body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<BytedanceImageGenerationResponse>() {})
    }



}
