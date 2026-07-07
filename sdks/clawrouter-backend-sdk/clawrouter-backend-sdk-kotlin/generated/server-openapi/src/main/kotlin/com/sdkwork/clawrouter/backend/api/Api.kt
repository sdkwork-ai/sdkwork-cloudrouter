package com.sdkwork.clawrouter.backend.api

import com.sdkwork.clawrouter.backend.http.HttpClient

/**
 * API modules for clawrouter-backend-sdk
 */
class Api(private val client: HttpClient) {
    val ai: AiApi = AiApi(client)
    val integration: IntegrationApi = IntegrationApi(client)
    val sites: SitesApi = SitesApi(client)
    val system: SystemApi = SystemApi(client)
}
