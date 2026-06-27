using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Sdkwork.ClawRouter.Open.Models;
using SdkHttpClient = Sdkwork.ClawRouter.Open.Http.HttpClient;

namespace Sdkwork.ClawRouter.Open.Api
{
    public class ImagesApi
    {
        private readonly SdkHttpClient _client;

        public ImagesApi(SdkHttpClient client)
        {
            _client = client;
        }

        /// <summary>
        /// Create image edit
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiImageList?> CreateEditAsync(Sdkwork.ClawRouter.Open.Models.OpenAiImageEditRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Open.Models.OpenAiImageList>(ApiPaths.AiPath("/images/edits"), body, null, null, "application/json");
        }

        /// <summary>
        /// Create image
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiImageList?> CreateGenerationAsync(Sdkwork.ClawRouter.Open.Models.OpenAiImageGenerationRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Open.Models.OpenAiImageList>(ApiPaths.AiPath("/images/generations"), body, null, null, "application/json");
        }

        /// <summary>
        /// Create image variation
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiImageList?> CreateVariationAsync(Sdkwork.ClawRouter.Open.Models.OpenAiImageVariationRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Open.Models.OpenAiImageList>(ApiPaths.AiPath("/images/variations"), body, null, null, "application/json");
        }



    }
}
