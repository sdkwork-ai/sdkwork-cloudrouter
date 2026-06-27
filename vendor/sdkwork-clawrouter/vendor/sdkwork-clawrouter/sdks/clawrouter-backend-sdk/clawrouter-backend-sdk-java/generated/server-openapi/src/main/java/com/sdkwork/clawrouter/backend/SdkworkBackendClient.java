package com.sdkwork.clawrouter.backend;

import com.sdkwork.common.core.Types;
import com.sdkwork.clawrouter.backend.http.HttpClient;
import com.sdkwork.clawrouter.backend.api.AiApi;
import com.sdkwork.clawrouter.backend.api.ContentApi;
import com.sdkwork.clawrouter.backend.api.IamApi;
import com.sdkwork.clawrouter.backend.api.IntegrationApi;
import com.sdkwork.clawrouter.backend.api.McpApi;
import com.sdkwork.clawrouter.backend.api.MessagingApi;
import com.sdkwork.clawrouter.backend.api.PromptsApi;
import com.sdkwork.clawrouter.backend.api.ServiceProvidersApi;
import com.sdkwork.clawrouter.backend.api.SitesApi;
import com.sdkwork.clawrouter.backend.api.StorageApi;
import com.sdkwork.clawrouter.backend.api.SystemApi;

public class SdkworkBackendClient {
    private final HttpClient httpClient;
    private AiApi ai;
    private ContentApi content;
    private IamApi iam;
    private IntegrationApi integration;
    private McpApi mcp;
    private MessagingApi messaging;
    private PromptsApi prompts;
    private ServiceProvidersApi serviceProviders;
    private SitesApi sites;
    private StorageApi storage;
    private SystemApi system;

    public SdkworkBackendClient(String baseUrl) {
        this.httpClient = new HttpClient(baseUrl);
        this.ai = new AiApi(httpClient);
        this.content = new ContentApi(httpClient);
        this.iam = new IamApi(httpClient);
        this.integration = new IntegrationApi(httpClient);
        this.mcp = new McpApi(httpClient);
        this.messaging = new MessagingApi(httpClient);
        this.prompts = new PromptsApi(httpClient);
        this.serviceProviders = new ServiceProvidersApi(httpClient);
        this.sites = new SitesApi(httpClient);
        this.storage = new StorageApi(httpClient);
        this.system = new SystemApi(httpClient);
    }

    public SdkworkBackendClient(Types.SdkConfig config) {
        this.httpClient = new HttpClient(config);
        this.ai = new AiApi(httpClient);
        this.content = new ContentApi(httpClient);
        this.iam = new IamApi(httpClient);
        this.integration = new IntegrationApi(httpClient);
        this.mcp = new McpApi(httpClient);
        this.messaging = new MessagingApi(httpClient);
        this.prompts = new PromptsApi(httpClient);
        this.serviceProviders = new ServiceProvidersApi(httpClient);
        this.sites = new SitesApi(httpClient);
        this.storage = new StorageApi(httpClient);
        this.system = new SystemApi(httpClient);
    }

    public AiApi getAi() {
        return this.ai;
    }

    public ContentApi getContent() {
        return this.content;
    }

    public IamApi getIam() {
        return this.iam;
    }

    public IntegrationApi getIntegration() {
        return this.integration;
    }

    public McpApi getMcp() {
        return this.mcp;
    }

    public MessagingApi getMessaging() {
        return this.messaging;
    }

    public PromptsApi getPrompts() {
        return this.prompts;
    }

    public ServiceProvidersApi getServiceProviders() {
        return this.serviceProviders;
    }

    public SitesApi getSites() {
        return this.sites;
    }

    public StorageApi getStorage() {
        return this.storage;
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
