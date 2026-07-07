using System;
using SDKwork.Common.Core;
using SdkHttpClient = Sdkwork.ClawRouter.App.Http.HttpClient;
using Sdkwork.ClawRouter.App.Api;

namespace Sdkwork.ClawRouter.App
{
    public class SdkworkAppClient
    {
        private readonly SdkHttpClient _httpClient;

        public SystemApi System { get; }
        public AiApi Ai { get; }
        public ChatApi Chat { get; }
        public IamApi Iam { get; }
        public NotificationApi Notification { get; }
        public RuntimeApi Runtime { get; }

        public SdkworkAppClient(string baseUrl)
        {
            _httpClient = new SdkHttpClient(baseUrl);
            System = new SystemApi(_httpClient);
            Ai = new AiApi(_httpClient);
            Chat = new ChatApi(_httpClient);
            Iam = new IamApi(_httpClient);
            Notification = new NotificationApi(_httpClient);
            Runtime = new RuntimeApi(_httpClient);
        }

        public SdkworkAppClient(SdkConfig config)
        {
            _httpClient = new SdkHttpClient(config);
            System = new SystemApi(_httpClient);
            Ai = new AiApi(_httpClient);
            Chat = new ChatApi(_httpClient);
            Iam = new IamApi(_httpClient);
            Notification = new NotificationApi(_httpClient);
            Runtime = new RuntimeApi(_httpClient);
        }
        public SdkworkAppClient SetAuthToken(string token)
        {
            _httpClient.SetAuthToken(token);
            return this;
        }

        public SdkworkAppClient SetAccessToken(string token)
        {
            _httpClient.SetAccessToken(token);
            return this;
        }

        public SdkworkAppClient SetHeader(string key, string value)
        {
            _httpClient.SetHeader(key, value);
            return this;
        }
    }
}
