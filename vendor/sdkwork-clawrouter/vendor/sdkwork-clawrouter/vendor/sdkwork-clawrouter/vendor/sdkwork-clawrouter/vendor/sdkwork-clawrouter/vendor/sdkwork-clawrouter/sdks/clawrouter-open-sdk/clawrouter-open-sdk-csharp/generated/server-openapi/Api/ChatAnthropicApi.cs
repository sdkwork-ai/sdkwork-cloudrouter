using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Sdkwork.ClawRouter.Open.Models;
using SdkHttpClient = Sdkwork.ClawRouter.Open.Http.HttpClient;

namespace Sdkwork.ClawRouter.Open.Api
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
        public async Task<Sdkwork.ClawRouter.Open.Models.AnthropicMessage?> CreateV1MessageAsync(Sdkwork.ClawRouter.Open.Models.AnthropicMessageCreateRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Open.Models.AnthropicMessage>(ApiPaths.AiPath("/anthropic/v1/messages"), body, null, null, "application/json");
        }

        /// <summary>
        /// Anthropic count message tokens
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.AnthropicCountMessageTokensResponse?> CreateV1MessagesCountTokenAsync(Sdkwork.ClawRouter.Open.Models.AnthropicCountMessageTokensRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Open.Models.AnthropicCountMessageTokensResponse>(ApiPaths.AiPath("/anthropic/v1/messages/count_tokens"), body, null, null, "application/json");
        }



    }
}
