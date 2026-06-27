package com.sdkwork.clawrouter.open.api

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import com.sdkwork.clawrouter.open.*
import com.sdkwork.clawrouter.open.http.HttpClient

class EmbeddingsApi(private val client: HttpClient) {

    /** Create embeddings */
    suspend fun create(body: OpenAiEmbeddingsRequest): OpenAiEmbeddingList? {
        val raw = client.post(ApiPaths.aiPath("/embeddings"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<OpenAiEmbeddingList>() {})
    }



}
