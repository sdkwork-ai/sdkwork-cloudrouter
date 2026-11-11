package com.sdkwork.cloudrouter.open.api

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import com.sdkwork.cloudrouter.open.*
import com.sdkwork.cloudrouter.open.http.HttpClient

class ChatTypesafeApi(private val client: HttpClient) {

    /** TypeSafe AI System One decision */
    suspend fun createV1Systemone(body: TypeSafeSystemOneRequest): TypeSafeSystemOneResponse? {
        val raw = client.post("/typesafe/v1/systemone", body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<TypeSafeSystemOneResponse>() {})
    }



}
