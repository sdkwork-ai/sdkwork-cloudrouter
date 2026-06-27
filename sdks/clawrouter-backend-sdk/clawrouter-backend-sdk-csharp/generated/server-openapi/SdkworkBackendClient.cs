using System;
using SDKwork.Common.Core;
using SdkHttpClient = Sdkwork.ClawRouter.Backend.Http.HttpClient;
using Sdkwork.ClawRouter.Backend.Api;

namespace Sdkwork.ClawRouter.Backend
{
    public class SdkworkBackendClient
    {
        private readonly SdkHttpClient _httpClient;

        public AiApi Ai { get; }
        public ContentApi Content { get; }
        public IamApi Iam { get; }
        public IntegrationApi Integration { get; }
        public McpApi Mcp { get; }
        public MessagingApi Messaging { get; }
        public PromptsApi Prompts { get; }
        public ServiceProvidersApi ServiceProviders { get; }
        public SitesApi Sites { get; }
        public StorageApi Storage { get; }
        public SystemApi System { get; }

        public SdkworkBackendClient(string baseUrl)
        {
            _httpClient = new SdkHttpClient(baseUrl);
            Ai = new AiApi(_httpClient);
            Content = new ContentApi(_httpClient);
            Iam = new IamApi(_httpClient);
            Integration = new IntegrationApi(_httpClient);
            Mcp = new McpApi(_httpClient);
            Messaging = new MessagingApi(_httpClient);
            Prompts = new PromptsApi(_httpClient);
            ServiceProviders = new ServiceProvidersApi(_httpClient);
            Sites = new SitesApi(_httpClient);
            Storage = new StorageApi(_httpClient);
            System = new SystemApi(_httpClient);
        }

        public SdkworkBackendClient(SdkConfig config)
        {
            _httpClient = new SdkHttpClient(config);
            Ai = new AiApi(_httpClient);
            Content = new ContentApi(_httpClient);
            Iam = new IamApi(_httpClient);
            Integration = new IntegrationApi(_httpClient);
            Mcp = new McpApi(_httpClient);
            Messaging = new MessagingApi(_httpClient);
            Prompts = new PromptsApi(_httpClient);
            ServiceProviders = new ServiceProvidersApi(_httpClient);
            Sites = new SitesApi(_httpClient);
            Storage = new StorageApi(_httpClient);
            System = new SystemApi(_httpClient);
        }
        public SdkworkBackendClient SetAuthToken(string token)
        {
            _httpClient.SetAuthToken(token);
            return this;
        }

        public SdkworkBackendClient SetAccessToken(string token)
        {
            _httpClient.SetAccessToken(token);
            return this;
        }

        public SdkworkBackendClient SetHeader(string key, string value)
        {
            _httpClient.SetHeader(key, value);
            return this;
        }
    }
}
