using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Sdkwork.CloudRouter.Open.Models;
using SdkHttpClient = Sdkwork.CloudRouter.Open.Http.HttpClient;

namespace Sdkwork.CloudRouter.Open.Api
{
    public class ChatAnthropicApi
    {
        private readonly SdkHttpClient _client;

        public ChatAnthropicApi(SdkHttpClient client)
        {
            _client = client;
        }

        /// <summary>
        /// Anthropic Claude message
        /// </summary>
        public async Task<Sdkwork.CloudRouter.Open.Models.AnthropicMessage?> CreateV1MessageAsync(Sdkwork.CloudRouter.Open.Models.AnthropicMessageCreateRequest body)
        {
            return await _client.PostAsync<Sdkwork.CloudRouter.Open.Models.AnthropicMessage>(ApiPaths.AiPath("/anthropic/v1/messages"), body, null, null, "application/json");
        }

        /// <summary>
        /// Anthropic count message tokens
        /// </summary>
        public async Task<Sdkwork.CloudRouter.Open.Models.AnthropicCountMessageTokensResponse?> CreateV1MessagesCountTokenAsync(Sdkwork.CloudRouter.Open.Models.AnthropicCountMessageTokensRequest body)
        {
            return await _client.PostAsync<Sdkwork.CloudRouter.Open.Models.AnthropicCountMessageTokensResponse>(ApiPaths.AiPath("/anthropic/v1/messages/count_tokens"), body, null, null, "application/json");
        }



    }
}
