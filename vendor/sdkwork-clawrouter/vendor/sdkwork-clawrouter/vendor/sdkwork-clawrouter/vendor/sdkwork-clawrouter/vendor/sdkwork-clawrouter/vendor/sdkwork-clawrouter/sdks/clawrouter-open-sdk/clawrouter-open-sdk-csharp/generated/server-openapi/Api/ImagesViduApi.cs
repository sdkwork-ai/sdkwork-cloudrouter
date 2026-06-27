using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Sdkwork.ClawRouter.Open.Models;
using SdkHttpClient = Sdkwork.ClawRouter.Open.Http.HttpClient;

namespace Sdkwork.ClawRouter.Open.Api
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
        public async Task<Sdkwork.ClawRouter.Open.Models.ViduImageGenerationTask?> CreateEntV2Reference2imageAsync(Sdkwork.ClawRouter.Open.Models.ViduReferenceToImageRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Open.Models.ViduImageGenerationTask>(ApiPaths.AiPath("/vidu/ent/v2/reference2image"), body, null, null, "application/json");
        }



    }
}
