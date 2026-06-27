package com.sdkwork.clawrouter.app

import com.sdkwork.common.core.SdkConfig
import com.sdkwork.clawrouter.app.http.HttpClient
import com.sdkwork.clawrouter.app.api.AiApi
import com.sdkwork.clawrouter.app.api.ChatApi
import com.sdkwork.clawrouter.app.api.IamApi
import com.sdkwork.clawrouter.app.api.NotificationApi
import com.sdkwork.clawrouter.app.api.RuntimeApi
import com.sdkwork.clawrouter.app.api.SystemApi

open class SdkworkAppClient {
    private val httpClient: HttpClient

    lateinit var ai: AiApi
    lateinit var chat: ChatApi
    lateinit var iam: IamApi
    lateinit var notification: NotificationApi
    lateinit var runtime: RuntimeApi
    lateinit var system: SystemApi

    constructor(baseUrl: String) {
        this.httpClient = HttpClient(baseUrl)
        ai = AiApi(httpClient)
        chat = ChatApi(httpClient)
        iam = IamApi(httpClient)
        notification = NotificationApi(httpClient)
        runtime = RuntimeApi(httpClient)
        system = SystemApi(httpClient)
    }

    constructor(config: SdkConfig) {
        this.httpClient = HttpClient(config)
        ai = AiApi(httpClient)
        chat = ChatApi(httpClient)
        iam = IamApi(httpClient)
        notification = NotificationApi(httpClient)
        runtime = RuntimeApi(httpClient)
        system = SystemApi(httpClient)
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
