using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Sdkwork.CloudRouter.Open.Models;
using SdkHttpClient = Sdkwork.CloudRouter.Open.Http.HttpClient;

namespace Sdkwork.CloudRouter.Open.Api
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
        public async Task<Sdkwork.CloudRouter.Open.Models.OpenAiImageList?> CreateEditAsync(Sdkwork.CloudRouter.Open.Models.OpenAiImageEditRequest body)
        {
            return await _client.PostAsync<Sdkwork.CloudRouter.Open.Models.OpenAiImageList>(ApiPaths.AiPath("/images/edits"), body, null, null, "application/json");
        }

        /// <summary>
        /// Create image
        /// </summary>
        public async Task<Sdkwork.CloudRouter.Open.Models.OpenAiImageList?> CreateGenerationAsync(Sdkwork.CloudRouter.Open.Models.OpenAiImageGenerationRequest body)
        {
            return await _client.PostAsync<Sdkwork.CloudRouter.Open.Models.OpenAiImageList>(ApiPaths.AiPath("/images/generations"), body, null, null, "application/json");
        }

        /// <summary>
        /// Create image variation
        /// </summary>
        public async Task<Sdkwork.CloudRouter.Open.Models.OpenAiImageList?> CreateVariationAsync(Sdkwork.CloudRouter.Open.Models.OpenAiImageVariationRequest body)
        {
            return await _client.PostAsync<Sdkwork.CloudRouter.Open.Models.OpenAiImageList>(ApiPaths.AiPath("/images/variations"), body, null, null, "application/json");
        }



    }
}
