using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Sdkwork.CloudRouter.Open.Models;
using SdkHttpClient = Sdkwork.CloudRouter.Open.Http.HttpClient;

namespace Sdkwork.CloudRouter.Open.Api
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
        public async Task<Sdkwork.CloudRouter.Open.Models.OpenAiModeration?> CreateAsync(Sdkwork.CloudRouter.Open.Models.OpenAiModerationCreateRequest body)
        {
            return await _client.PostAsync<Sdkwork.CloudRouter.Open.Models.OpenAiModeration>(ApiPaths.AiPath("/moderations"), body, null, null, "application/json");
        }



    }
}
