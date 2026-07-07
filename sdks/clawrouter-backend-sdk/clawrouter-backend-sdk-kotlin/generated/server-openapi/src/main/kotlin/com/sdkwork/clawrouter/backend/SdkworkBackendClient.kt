package com.sdkwork.clawrouter.backend

import com.sdkwork.common.core.SdkConfig
import com.sdkwork.clawrouter.backend.http.HttpClient
import com.sdkwork.clawrouter.backend.api.AiApi
import com.sdkwork.clawrouter.backend.api.IntegrationApi
import com.sdkwork.clawrouter.backend.api.SitesApi
import com.sdkwork.clawrouter.backend.api.SystemApi

open class SdkworkBackendClient {
    private val httpClient: HttpClient

    lateinit var ai: AiApi
    lateinit var integration: IntegrationApi
    lateinit var sites: SitesApi
    lateinit var system: SystemApi

    constructor(baseUrl: String) {
        this.httpClient = HttpClient(baseUrl)
        ai = AiApi(httpClient)
        integration = IntegrationApi(httpClient)
        sites = SitesApi(httpClient)
        system = SystemApi(httpClient)
    }

    constructor(config: SdkConfig) {
        this.httpClient = HttpClient(config)
        ai = AiApi(httpClient)
        integration = IntegrationApi(httpClient)
        sites = SitesApi(httpClient)
        system = SystemApi(httpClient)
    }
    fun setAuthToken(token: String): SdkworkBackendClient {
        httpClient.setAuthToken(token)
        return this
    }

    fun setAccessToken(token: String): SdkworkBackendClient {
        httpClient.setAccessToken(token)
        return this
    }

    fun setHeader(key: String, value: String): SdkworkBackendClient {
        httpClient.setHeader(key, value)
        return this
    }
}
