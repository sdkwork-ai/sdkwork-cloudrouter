package com.sdkwork.cloudrouter.open.api

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import com.sdkwork.cloudrouter.open.*
import com.sdkwork.cloudrouter.open.http.HttpClient

class ImagesZhipuApi(private val client: HttpClient) {

    /** Zhipu CogView image generation */
    suspend fun createApiPaasV4ImagesGeneration(body: ZhipuImageGenerationRequest): ZhipuImageGenerationResponse? {
        val raw = client.post("/zhipu/api/paas/v4/images/generations", body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<ZhipuImageGenerationResponse>() {})
    }



}
