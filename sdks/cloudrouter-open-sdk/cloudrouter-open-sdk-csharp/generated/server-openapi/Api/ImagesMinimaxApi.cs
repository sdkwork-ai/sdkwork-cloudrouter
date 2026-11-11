using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Sdkwork.CloudRouter.Open.Models;
using SdkHttpClient = Sdkwork.CloudRouter.Open.Http.HttpClient;

namespace Sdkwork.CloudRouter.Open.Api
{
    public class ImagesMinimaxApi
    {
        private readonly SdkHttpClient _client;

        public ImagesMinimaxApi(SdkHttpClient client)
        {
            _client = client;
        }

        /// <summary>
        /// MiniMax image generation
        /// </summary>
        public async Task<Sdkwork.CloudRouter.Open.Models.MinimaxImageGenerationResponse?> CreateV1ImageGenerationAsync(Sdkwork.CloudRouter.Open.Models.MinimaxImageGenerationRequest body)
        {
            return await _client.PostAsync<Sdkwork.CloudRouter.Open.Models.MinimaxImageGenerationResponse>("/minimax/v1/image_generation", body, null, null, "application/json");
        }



    }
}
