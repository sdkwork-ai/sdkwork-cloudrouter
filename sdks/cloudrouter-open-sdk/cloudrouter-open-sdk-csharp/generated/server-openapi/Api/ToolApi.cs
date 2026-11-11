using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Sdkwork.CloudRouter.Open.Models;
using SdkHttpClient = Sdkwork.CloudRouter.Open.Http.HttpClient;

namespace Sdkwork.CloudRouter.Open.Api
{
    public class ToolApi
    {
        private readonly SdkHttpClient _client;

        public ToolApi(SdkHttpClient client)
        {
            _client = client;
        }

        /// <summary>
        /// Fetch a web page
        /// </summary>
        public async Task<Sdkwork.CloudRouter.Open.Models.OpenAiDeepSeekWebFetchResponse?> CreateFetchAsync(Sdkwork.CloudRouter.Open.Models.OpenAiDeepSeekWebFetchRequest body)
        {
            return await _client.PostAsync<Sdkwork.CloudRouter.Open.Models.OpenAiDeepSeekWebFetchResponse>(ApiPaths.AiPath("/tools/fetch"), body, null, null, "application/json");
        }

        /// <summary>
        /// Search the web
        /// </summary>
        public async Task<Sdkwork.CloudRouter.Open.Models.OpenAiDeepSeekWebSearchResponse?> SearchAsync(Sdkwork.CloudRouter.Open.Models.OpenAiDeepSeekWebSearchRequest body)
        {
            return await _client.PostAsync<Sdkwork.CloudRouter.Open.Models.OpenAiDeepSeekWebSearchResponse>(ApiPaths.AiPath("/tools/search"), body, null, null, "application/json");
        }



    }
}
