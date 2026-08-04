using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Sdkwork.CloudRouter.Open.Models;
using SdkHttpClient = Sdkwork.CloudRouter.Open.Http.HttpClient;

namespace Sdkwork.CloudRouter.Open.Api
{
    public class ImagesViduApi
    {
        private readonly SdkHttpClient _client;

        public ImagesViduApi(SdkHttpClient client)
        {
            _client = client;
        }

        /// <summary>
        /// Vidu reference to image
        /// </summary>
        public async Task<Sdkwork.CloudRouter.Open.Models.ViduImageGenerationTask?> CreateEntV2Reference2imageAsync(Sdkwork.CloudRouter.Open.Models.ViduReferenceToImageRequest body)
        {
            return await _client.PostAsync<Sdkwork.CloudRouter.Open.Models.ViduImageGenerationTask>(ApiPaths.AiPath("/vidu/ent/v2/reference2image"), body, null, null, "application/json");
        }



    }
}
