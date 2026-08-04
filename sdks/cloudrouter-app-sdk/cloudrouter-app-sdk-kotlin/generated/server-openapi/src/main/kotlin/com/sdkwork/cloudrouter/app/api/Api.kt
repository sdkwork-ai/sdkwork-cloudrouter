package com.sdkwork.cloudrouter.app.api

import com.sdkwork.cloudrouter.app.http.HttpClient

/**
 * API modules for cloudrouter-app-sdk
 */
class Api(private val client: HttpClient) {
    val system: SystemApi = SystemApi(client)
    val ai: AiApi = AiApi(client)
    val chat: ChatApi = ChatApi(client)
    val iam: IamApi = IamApi(client)
    val notification: NotificationApi = NotificationApi(client)
    val runtime: RuntimeApi = RuntimeApi(client)
}
