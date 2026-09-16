using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Sdkwork.CloudRouter.Open.Models;
using SdkHttpClient = Sdkwork.CloudRouter.Open.Http.HttpClient;

namespace Sdkwork.CloudRouter.Open.Api
{
    public class AudioVolcengineApi
    {
        private readonly SdkHttpClient _client;

        public AudioVolcengineApi(SdkHttpClient client)
        {
            _client = client;
        }

        /// <summary>
        /// Volcengine create speech
        /// </summary>
        public async Task<string?> CreateApiV3AudioSpeechAsync(Sdkwork.CloudRouter.Open.Models.OpenAiSpeechCreateRequest body)
        {
            return await _client.PostAsync<string>(ApiPaths.AiPath("/volcengine/api/v3/audio/speech"), body, null, null, "application/json");
        }



    }
}
