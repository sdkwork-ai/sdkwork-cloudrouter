using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Sdkwork.CloudRouter.Open.Models;
using SdkHttpClient = Sdkwork.CloudRouter.Open.Http.HttpClient;

namespace Sdkwork.CloudRouter.Open.Api
{
    public class ImagesZhipuApi
    {
        private readonly SdkHttpClient _client;

        public ImagesZhipuApi(SdkHttpClient client)
        {
            _client = client;
        }

        /// <summary>
        /// Zhipu CogView image generation
        /// </summary>
        public async Task<Sdkwork.CloudRouter.Open.Models.ZhipuImageGenerationResponse?> CreateApiPaasV4ImagesGenerationAsync(Sdkwork.CloudRouter.Open.Models.ZhipuImageGenerationRequest body)
        {
            return await _client.PostAsync<Sdkwork.CloudRouter.Open.Models.ZhipuImageGenerationResponse>("/zhipu/api/paas/v4/images/generations", body, null, null, "application/json");
        }



    }
}
