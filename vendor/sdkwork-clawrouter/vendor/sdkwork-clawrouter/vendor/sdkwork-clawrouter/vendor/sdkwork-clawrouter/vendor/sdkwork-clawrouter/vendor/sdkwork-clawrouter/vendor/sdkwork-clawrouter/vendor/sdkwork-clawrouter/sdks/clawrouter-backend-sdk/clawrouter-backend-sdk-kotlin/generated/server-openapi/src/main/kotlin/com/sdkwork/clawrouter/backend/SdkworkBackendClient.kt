package com.sdkwork.clawrouter.backend

import com.sdkwork.common.core.SdkConfig
import com.sdkwork.clawrouter.backend.http.HttpClient
import com.sdkwork.clawrouter.backend.api.AiApi
import com.sdkwork.clawrouter.backend.api.ContentApi
import com.sdkwork.clawrouter.backend.api.IamApi
import com.sdkwork.clawrouter.backend.api.IntegrationApi
import com.sdkwork.clawrouter.backend.api.McpApi
import com.sdkwork.clawrouter.backend.api.MessagingApi
import com.sdkwork.clawrouter.backend.api.PromptsApi
import com.sdkwork.clawrouter.backend.api.ServiceProvidersApi
import com.sdkwork.clawrouter.backend.api.SitesApi
import com.sdkwork.clawrouter.backend.api.StorageApi
import com.sdkwork.clawrouter.backend.api.SystemApi

open class SdkworkBackendClient {
    private val httpClient: HttpClient

    lateinit var ai: AiApi
    lateinit var content: ContentApi
    lateinit var iam: IamApi
    lateinit var integration: IntegrationApi
    lateinit var mcp: McpApi
    lateinit var messaging: MessagingApi
    lateinit var prompts: PromptsApi
    lateinit var serviceProviders: ServiceProvidersApi
    lateinit var sites: SitesApi
    lateinit var storage: StorageApi
    lateinit var system: SystemApi

    constructor(baseUrl: String) {
        this.httpClient = HttpClient(baseUrl)
        ai = AiApi(httpClient)
        content = ContentApi(httpClient)
        iam = IamApi(httpClient)
        integration = IntegrationApi(httpClient)
        mcp = McpApi(httpClient)
        messaging = MessagingApi(httpClient)
        prompts = PromptsApi(httpClient)
        serviceProviders = ServiceProvidersApi(httpClient)
        sites = SitesApi(httpClient)
        storage = StorageApi(httpClient)
        system = SystemApi(httpClient)
    }

    constructor(config: SdkConfig) {
        this.httpClient = HttpClient(config)
        ai = AiApi(httpClient)
        content = ContentApi(httpClient)
        iam = IamApi(httpClient)
        integration = IntegrationApi(httpClient)
        mcp = McpApi(httpClient)
        messaging = MessagingApi(httpClient)
        prompts = PromptsApi(httpClient)
        serviceProviders = ServiceProvidersApi(httpClient)
        sites = SitesApi(httpClient)
        storage = StorageApi(httpClient)
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
