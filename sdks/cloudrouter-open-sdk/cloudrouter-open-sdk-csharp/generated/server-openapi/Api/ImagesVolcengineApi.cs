using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Sdkwork.CloudRouter.Open.Models;
using SdkHttpClient = Sdkwork.CloudRouter.Open.Http.HttpClient;

namespace Sdkwork.CloudRouter.Open.Api
{
    public class ImagesVolcengineApi
    {
        private readonly SdkHttpClient _client;

        public ImagesVolcengineApi(SdkHttpClient client)
        {
            _client = client;
        }

        /// <summary>
        /// Volcengine Ark image generation
        /// </summary>
        public async Task<Sdkwork.CloudRouter.Open.Models.VolcengineImageGenerationResponse?> CreateApiV3ImagesGenerationAsync(Sdkwork.CloudRouter.Open.Models.VolcengineImageGenerationRequest body)
        {
            return await _client.PostAsync<Sdkwork.CloudRouter.Open.Models.VolcengineImageGenerationResponse>("/volcengine/api/v3/images/generations", body, null, null, "application/json");
        }



    }
}
