using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Sdkwork.CloudRouter.Open.Models;
using SdkHttpClient = Sdkwork.CloudRouter.Open.Http.HttpClient;

namespace Sdkwork.CloudRouter.Open.Api
{
    public class ImagesBytedanceApi
    {
        private readonly SdkHttpClient _client;

        public ImagesBytedanceApi(SdkHttpClient client)
        {
            _client = client;
        }

        /// <summary>
        /// ByteDance Seedream image generation
        /// </summary>
        public async Task<Sdkwork.CloudRouter.Open.Models.BytedanceImageGenerationResponse?> CreateApiV3ImagesGenerationAsync(Sdkwork.CloudRouter.Open.Models.BytedanceImageGenerationRequest body)
        {
            return await _client.PostAsync<Sdkwork.CloudRouter.Open.Models.BytedanceImageGenerationResponse>("/bytedance/api/v3/images/generations", body, null, null, "application/json");
        }



    }
}
