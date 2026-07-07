package com.sdkwork.clawrouter.backend;

import com.sdkwork.common.core.Types;
import com.sdkwork.clawrouter.backend.http.HttpClient;
import com.sdkwork.clawrouter.backend.api.AiApi;
import com.sdkwork.clawrouter.backend.api.IntegrationApi;
import com.sdkwork.clawrouter.backend.api.SitesApi;
import com.sdkwork.clawrouter.backend.api.SystemApi;

public class SdkworkBackendClient {
    private final HttpClient httpClient;
    private AiApi ai;
    private IntegrationApi integration;
    private SitesApi sites;
    private SystemApi system;

    public SdkworkBackendClient(String baseUrl) {
        this.httpClient = new HttpClient(baseUrl);
        this.ai = new AiApi(httpClient);
        this.integration = new IntegrationApi(httpClient);
        this.sites = new SitesApi(httpClient);
        this.system = new SystemApi(httpClient);
    }

    public SdkworkBackendClient(Types.SdkConfig config) {
        this.httpClient = new HttpClient(config);
        this.ai = new AiApi(httpClient);
        this.integration = new IntegrationApi(httpClient);
        this.sites = new SitesApi(httpClient);
        this.system = new SystemApi(httpClient);
    }

    public AiApi getAi() {
        return this.ai;
    }

    public IntegrationApi getIntegration() {
        return this.integration;
    }

    public SitesApi getSites() {
        return this.sites;
    }

    public SystemApi getSystem() {
        return this.system;
    }
    public SdkworkBackendClient setAuthToken(String token) {
        httpClient.setAuthToken(token);
        return this;
    }

    public SdkworkBackendClient setAccessToken(String token) {
        httpClient.setAccessToken(token);
        return this;
    }

    public SdkworkBackendClient setHeader(String key, String value) {
        httpClient.setHeader(key, value);
        return this;
    }

    public HttpClient getHttpClient() {
        return httpClient;
    }
}
