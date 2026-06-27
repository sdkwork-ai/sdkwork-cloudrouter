package com.sdkwork.clawrouter.app;

import com.sdkwork.common.core.Types;
import com.sdkwork.clawrouter.app.http.HttpClient;
import com.sdkwork.clawrouter.app.api.AiApi;
import com.sdkwork.clawrouter.app.api.ChatApi;
import com.sdkwork.clawrouter.app.api.IamApi;
import com.sdkwork.clawrouter.app.api.NotificationApi;
import com.sdkwork.clawrouter.app.api.RuntimeApi;
import com.sdkwork.clawrouter.app.api.SystemApi;

public class SdkworkAppClient {
    private final HttpClient httpClient;
    private AiApi ai;
    private ChatApi chat;
    private IamApi iam;
    private NotificationApi notification;
    private RuntimeApi runtime;
    private SystemApi system;

    public SdkworkAppClient(String baseUrl) {
        this.httpClient = new HttpClient(baseUrl);
        this.ai = new AiApi(httpClient);
        this.chat = new ChatApi(httpClient);
        this.iam = new IamApi(httpClient);
        this.notification = new NotificationApi(httpClient);
        this.runtime = new RuntimeApi(httpClient);
        this.system = new SystemApi(httpClient);
    }

    public SdkworkAppClient(Types.SdkConfig config) {
        this.httpClient = new HttpClient(config);
        this.ai = new AiApi(httpClient);
        this.chat = new ChatApi(httpClient);
        this.iam = new IamApi(httpClient);
        this.notification = new NotificationApi(httpClient);
        this.runtime = new RuntimeApi(httpClient);
        this.system = new SystemApi(httpClient);
    }

    public AiApi getAi() {
        return this.ai;
    }

    public ChatApi getChat() {
        return this.chat;
    }

    public IamApi getIam() {
        return this.iam;
    }

    public NotificationApi getNotification() {
        return this.notification;
    }

    public RuntimeApi getRuntime() {
        return this.runtime;
    }

    public SystemApi getSystem() {
        return this.system;
    }
    public SdkworkAppClient setAuthToken(String token) {
        httpClient.setAuthToken(token);
        return this;
    }

    public SdkworkAppClient setAccessToken(String token) {
        httpClient.setAccessToken(token);
        return this;
    }

    public SdkworkAppClient setHeader(String key, String value) {
        httpClient.setHeader(key, value);
        return this;
    }

    public HttpClient getHttpClient() {
        return httpClient;
    }
}
