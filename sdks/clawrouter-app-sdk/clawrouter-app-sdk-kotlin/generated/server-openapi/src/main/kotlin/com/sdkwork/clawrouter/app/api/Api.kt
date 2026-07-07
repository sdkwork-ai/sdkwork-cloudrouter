package com.sdkwork.clawrouter.app.api

import com.sdkwork.clawrouter.app.http.HttpClient

/**
 * API modules for clawrouter-app-sdk
 */
class Api(private val client: HttpClient) {
    val system: SystemApi = SystemApi(client)
    val ai: AiApi = AiApi(client)
    val chat: ChatApi = ChatApi(client)
    val iam: IamApi = IamApi(client)
    val notification: NotificationApi = NotificationApi(client)
    val runtime: RuntimeApi = RuntimeApi(client)
}
