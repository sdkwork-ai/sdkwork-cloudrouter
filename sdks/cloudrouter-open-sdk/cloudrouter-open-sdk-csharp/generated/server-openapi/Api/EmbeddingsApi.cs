using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Sdkwork.CloudRouter.Open.Models;
using SdkHttpClient = Sdkwork.CloudRouter.Open.Http.HttpClient;

namespace Sdkwork.CloudRouter.Open.Api
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
        public async Task<Sdkwork.CloudRouter.Open.Models.OpenAiEmbeddingList?> CreateAsync(Sdkwork.CloudRouter.Open.Models.OpenAiEmbeddingsRequest body)
        {
            return await _client.PostAsync<Sdkwork.CloudRouter.Open.Models.OpenAiEmbeddingList>(ApiPaths.AiPath("/embeddings"), body, null, null, "application/json");
        }



    }
}
