using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Sdkwork.ClawRouter.Open.Models;
using SdkHttpClient = Sdkwork.ClawRouter.Open.Http.HttpClient;

namespace Sdkwork.ClawRouter.Open.Api
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
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiCompletion?> CreateAsync(Sdkwork.ClawRouter.Open.Models.OpenAiCompletionCreateRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Open.Models.OpenAiCompletion>(ApiPaths.AiPath("/completions"), body, null, null, "application/json");
        }



    }
}
