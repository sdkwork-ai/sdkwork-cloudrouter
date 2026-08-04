package com.sdkwork.cloudrouter.app;

import com.sdkwork.common.core.Types;
import com.sdkwork.cloudrouter.app.http.HttpClient;
import com.sdkwork.cloudrouter.app.api.SystemApi;
import com.sdkwork.cloudrouter.app.api.AiApi;
import com.sdkwork.cloudrouter.app.api.ChatApi;
import com.sdkwork.cloudrouter.app.api.IamApi;
import com.sdkwork.cloudrouter.app.api.NotificationApi;
import com.sdkwork.cloudrouter.app.api.RuntimeApi;

public class SdkworkAppClient {
    private final HttpClient httpClient;
    private SystemApi system;
    private AiApi ai;
    private ChatApi chat;
    private IamApi iam;
    private NotificationApi notification;
    private RuntimeApi runtime;

    public SdkworkAppClient(String baseUrl) {
        this.httpClient = new HttpClient(baseUrl);
        this.system = new SystemApi(httpClient);
        this.ai = new AiApi(httpClient);
        this.chat = new ChatApi(httpClient);
        this.iam = new IamApi(httpClient);
        this.notification = new NotificationApi(httpClient);
        this.runtime = new RuntimeApi(httpClient);
    }

    public SdkworkAppClient(Types.SdkConfig config) {
        this.httpClient = new HttpClient(config);
        this.system = new SystemApi(httpClient);
        this.ai = new AiApi(httpClient);
        this.chat = new ChatApi(httpClient);
        this.iam = new IamApi(httpClient);
        this.notification = new NotificationApi(httpClient);
        this.runtime = new RuntimeApi(httpClient);
    }

    public SystemApi getSystem() {
        return this.system;
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
