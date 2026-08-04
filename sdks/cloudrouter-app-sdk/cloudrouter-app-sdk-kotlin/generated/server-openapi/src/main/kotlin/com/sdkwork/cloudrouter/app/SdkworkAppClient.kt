package com.sdkwork.cloudrouter.app

import com.sdkwork.common.core.SdkConfig
import com.sdkwork.cloudrouter.app.http.HttpClient
import com.sdkwork.cloudrouter.app.api.SystemApi
import com.sdkwork.cloudrouter.app.api.AiApi
import com.sdkwork.cloudrouter.app.api.ChatApi
import com.sdkwork.cloudrouter.app.api.IamApi
import com.sdkwork.cloudrouter.app.api.NotificationApi
import com.sdkwork.cloudrouter.app.api.RuntimeApi

open class SdkworkAppClient {
    private val httpClient: HttpClient

    lateinit var system: SystemApi
    lateinit var ai: AiApi
    lateinit var chat: ChatApi
    lateinit var iam: IamApi
    lateinit var notification: NotificationApi
    lateinit var runtime: RuntimeApi

    constructor(baseUrl: String) {
        this.httpClient = HttpClient(baseUrl)
        system = SystemApi(httpClient)
        ai = AiApi(httpClient)
        chat = ChatApi(httpClient)
        iam = IamApi(httpClient)
        notification = NotificationApi(httpClient)
        runtime = RuntimeApi(httpClient)
    }

    constructor(config: SdkConfig) {
        this.httpClient = HttpClient(config)
        system = SystemApi(httpClient)
        ai = AiApi(httpClient)
        chat = ChatApi(httpClient)
        iam = IamApi(httpClient)
        notification = NotificationApi(httpClient)
        runtime = RuntimeApi(httpClient)
    }
    fun setAuthToken(token: String): SdkworkAppClient {
        httpClient.setAuthToken(token)
        return this
    }

    fun setAccessToken(token: String): SdkworkAppClient {
        httpClient.setAccessToken(token)
        return this
    }

    fun setHeader(key: String, value: String): SdkworkAppClient {
        httpClient.setHeader(key, value)
        return this
    }
}
