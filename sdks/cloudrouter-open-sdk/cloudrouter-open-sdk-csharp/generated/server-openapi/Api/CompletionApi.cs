using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Sdkwork.CloudRouter.Open.Models;
using SdkHttpClient = Sdkwork.CloudRouter.Open.Http.HttpClient;

namespace Sdkwork.CloudRouter.Open.Api
{
    public class CompletionApi
    {
        private readonly SdkHttpClient _client;

        public CompletionApi(SdkHttpClient client)
        {
            _client = client;
        }

        /// <summary>
        /// Create completion
        /// </summary>
        public async Task<Sdkwork.CloudRouter.Open.Models.OpenAiCompletion?> CreateAsync(Sdkwork.CloudRouter.Open.Models.OpenAiCompletionCreateRequest body)
        {
            return await _client.PostAsync<Sdkwork.CloudRouter.Open.Models.OpenAiCompletion>(ApiPaths.AiPath("/completions"), body, null, null, "application/json");
        }



    }
}
