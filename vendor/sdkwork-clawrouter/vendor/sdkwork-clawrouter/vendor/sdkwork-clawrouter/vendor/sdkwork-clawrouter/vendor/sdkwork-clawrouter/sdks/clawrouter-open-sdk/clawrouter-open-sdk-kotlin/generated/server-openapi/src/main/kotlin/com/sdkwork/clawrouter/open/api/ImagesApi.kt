package com.sdkwork.clawrouter.open.api

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import com.sdkwork.clawrouter.open.*
import com.sdkwork.clawrouter.open.http.HttpClient

class ImagesApi(private val client: HttpClient) {

    /** Create image edit */
    suspend fun createEdit(body: OpenAiImageEditRequest): OpenAiImageList? {
        val raw = client.post(ApiPaths.aiPath("/images/edits"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<OpenAiImageList>() {})
    }

    /** Create image */
    suspend fun createGeneration(body: OpenAiImageGenerationRequest): OpenAiImageList? {
        val raw = client.post(ApiPaths.aiPath("/images/generations"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<OpenAiImageList>() {})
    }

    /** Create image variation */
    suspend fun createVariation(body: OpenAiImageVariationRequest): OpenAiImageList? {
        val raw = client.post(ApiPaths.aiPath("/images/variations"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<OpenAiImageList>() {})
    }



}
