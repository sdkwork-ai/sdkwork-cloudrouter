using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Sdkwork.ClawRouter.Open.Models;
using SdkHttpClient = Sdkwork.ClawRouter.Open.Http.HttpClient;

namespace Sdkwork.ClawRouter.Open.Api
{
    public class EmbeddingsApi
    {
        private readonly SdkHttpClient _client;

        public EmbeddingsApi(SdkHttpClient client)
        {
            _client = client;
        }

        /// <summary>
        /// Create embeddings
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiEmbeddingList?> CreateAsync(Sdkwork.ClawRouter.Open.Models.OpenAiEmbeddingsRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Open.Models.OpenAiEmbeddingList>(ApiPaths.AiPath("/embeddings"), body, null, null, "application/json");
        }



    }
}
