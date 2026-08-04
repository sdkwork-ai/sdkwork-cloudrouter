package com.sdkwork.cloudrouter.backend.api

import com.sdkwork.cloudrouter.backend.http.HttpClient

/**
 * API modules for cloudrouter-backend-sdk
 */
class Api(private val client: HttpClient) {
    val ai: AiApi = AiApi(client)
    val integration: IntegrationApi = IntegrationApi(client)
    val sites: SitesApi = SitesApi(client)
    val system: SystemApi = SystemApi(client)
}
