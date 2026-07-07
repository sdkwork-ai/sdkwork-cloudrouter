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
        public IntegrationApi Integration { get; }
        public SitesApi Sites { get; }
        public SystemApi System { get; }

        public SdkworkBackendClient(string baseUrl)
        {
            _httpClient = new SdkHttpClient(baseUrl);
            Ai = new AiApi(_httpClient);
            Integration = new IntegrationApi(_httpClient);
            Sites = new SitesApi(_httpClient);
            System = new SystemApi(_httpClient);
        }

        public SdkworkBackendClient(SdkConfig config)
        {
            _httpClient = new SdkHttpClient(config);
            Ai = new AiApi(_httpClient);
            Integration = new IntegrationApi(_httpClient);
            Sites = new SitesApi(_httpClient);
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
