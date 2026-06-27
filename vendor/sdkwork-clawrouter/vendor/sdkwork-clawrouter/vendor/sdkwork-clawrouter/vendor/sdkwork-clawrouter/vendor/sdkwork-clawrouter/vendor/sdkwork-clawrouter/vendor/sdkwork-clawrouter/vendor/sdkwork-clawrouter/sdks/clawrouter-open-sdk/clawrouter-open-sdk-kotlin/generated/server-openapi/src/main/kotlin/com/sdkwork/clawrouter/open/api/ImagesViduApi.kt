package com.sdkwork.clawrouter.open.api

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import com.sdkwork.clawrouter.open.*
import com.sdkwork.clawrouter.open.http.HttpClient

class ImagesViduApi(private val client: HttpClient) {

    /** Vidu reference to image */
    suspend fun createEntV2Reference2image(body: ViduReferenceToImageRequest): ViduImageGenerationTask? {
        val raw = client.post(ApiPaths.aiPath("/vidu/ent/v2/reference2image"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<ViduImageGenerationTask>() {})
    }



}
