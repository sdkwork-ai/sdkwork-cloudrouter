package com.sdkwork.clawrouter.backend.api

import com.sdkwork.clawrouter.backend.http.HttpClient

/**
 * API modules for clawrouter-backend-sdk
 */
class Api(private val client: HttpClient) {
    val ai: AiApi = AiApi(client)
    val content: ContentApi = ContentApi(client)
    val iam: IamApi = IamApi(client)
    val integration: IntegrationApi = IntegrationApi(client)
    val mcp: McpApi = McpApi(client)
    val messaging: MessagingApi = MessagingApi(client)
    val prompts: PromptsApi = PromptsApi(client)
    val serviceProviders: ServiceProvidersApi = ServiceProvidersApi(client)
    val sites: SitesApi = SitesApi(client)
    val storage: StorageApi = StorageApi(client)
    val system: SystemApi = SystemApi(client)
}
