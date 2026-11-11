using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Sdkwork.CloudRouter.Open.Models;
using SdkHttpClient = Sdkwork.CloudRouter.Open.Http.HttpClient;

namespace Sdkwork.CloudRouter.Open.Api
{
    public class VideosBlackForestLabsApi
    {
        private readonly SdkHttpClient _client;

        public VideosBlackForestLabsApi(SdkHttpClient client)
        {
            _client = client;
        }

        /// <summary>
        /// Black Forest Labs FLUX 3 video generation
        /// </summary>
        public async Task<Sdkwork.CloudRouter.Open.Models.BlackForestLabsVideoGenerationTask?> CreateFlux3VideoAsync(Sdkwork.CloudRouter.Open.Models.BlackForestLabsVideoGenerationRequest body)
        {
            return await _client.PostAsync<Sdkwork.CloudRouter.Open.Models.BlackForestLabsVideoGenerationTask>("/black_forest_labs/v1/flux-3-video", body, null, null, "application/json");
        }



    }
}
