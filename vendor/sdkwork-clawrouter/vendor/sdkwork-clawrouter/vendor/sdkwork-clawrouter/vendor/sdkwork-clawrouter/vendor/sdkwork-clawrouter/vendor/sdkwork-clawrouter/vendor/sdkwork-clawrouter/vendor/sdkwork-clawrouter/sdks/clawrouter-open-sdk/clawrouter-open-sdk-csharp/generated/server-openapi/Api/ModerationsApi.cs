using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Sdkwork.ClawRouter.Open.Models;
using SdkHttpClient = Sdkwork.ClawRouter.Open.Http.HttpClient;

namespace Sdkwork.ClawRouter.Open.Api
{
    public class ModerationsApi
    {
        private readonly SdkHttpClient _client;

        public ModerationsApi(SdkHttpClient client)
        {
            _client = client;
        }

        /// <summary>
        /// Create moderation
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiModeration?> CreateAsync(Sdkwork.ClawRouter.Open.Models.OpenAiModerationCreateRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Open.Models.OpenAiModeration>(ApiPaths.AiPath("/moderations"), body, null, null, "application/json");
        }



    }
}
