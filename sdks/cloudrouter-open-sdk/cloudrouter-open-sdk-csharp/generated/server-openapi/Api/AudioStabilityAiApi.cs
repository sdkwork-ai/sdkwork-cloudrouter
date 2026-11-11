using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Sdkwork.CloudRouter.Open.Models;
using SdkHttpClient = Sdkwork.CloudRouter.Open.Http.HttpClient;

namespace Sdkwork.CloudRouter.Open.Api
{
    public class AudioStabilityAiApi
    {
        private readonly SdkHttpClient _client;

        public AudioStabilityAiApi(SdkHttpClient client)
        {
            _client = client;
        }

        /// <summary>
        /// Stability AI text-to-audio (music and sound effects)
        /// </summary>
        public async Task<string?> CreateTextToAudioAsync(Sdkwork.CloudRouter.Open.Models.StabilityAudioRequest body)
        {
            return await _client.PostAsync<string>("/stability_ai/v2beta/audio/stable-audio-2/text-to-audio", body, null, null, "multipart/form-data");
        }



    }
}
