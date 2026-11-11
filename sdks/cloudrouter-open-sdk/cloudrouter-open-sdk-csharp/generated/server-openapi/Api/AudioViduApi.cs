using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Sdkwork.CloudRouter.Open.Models;
using SdkHttpClient = Sdkwork.CloudRouter.Open.Http.HttpClient;

namespace Sdkwork.CloudRouter.Open.Api
{
    public class AudioViduApi
    {
        private readonly SdkHttpClient _client;

        public AudioViduApi(SdkHttpClient client)
        {
            _client = client;
        }

        /// <summary>
        /// Vidu text to audio
        /// </summary>
        public async Task<Sdkwork.CloudRouter.Open.Models.ViduAudioGenerationTask?> CreateEntV2Text2audioAsync(Sdkwork.CloudRouter.Open.Models.ViduTextToAudioRequest body)
        {
            return await _client.PostAsync<Sdkwork.CloudRouter.Open.Models.ViduAudioGenerationTask>("/vidu/ent/v2/text2audio", body, null, null, "application/json");
        }

        /// <summary>
        /// Vidu timing to audio
        /// </summary>
        public async Task<Sdkwork.CloudRouter.Open.Models.ViduAudioGenerationTask?> CreateEntV2Timing2audioAsync(Sdkwork.CloudRouter.Open.Models.ViduTimingToAudioRequest body)
        {
            return await _client.PostAsync<Sdkwork.CloudRouter.Open.Models.ViduAudioGenerationTask>("/vidu/ent/v2/timing2audio", body, null, null, "application/json");
        }



    }
}
