using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Sdkwork.CloudRouter.Open.Models;
using SdkHttpClient = Sdkwork.CloudRouter.Open.Http.HttpClient;

namespace Sdkwork.CloudRouter.Open.Api
{
    public class AudioAlibabaApi
    {
        private readonly SdkHttpClient _client;

        public AudioAlibabaApi(SdkHttpClient client)
        {
            _client = client;
        }

        /// <summary>
        /// Alibaba Qwen TTS speech synthesis
        /// </summary>
        public async Task<Sdkwork.CloudRouter.Open.Models.AlibabaSpeechResponse?> CreateApiV1ServicesAudioTtsSpeechSynthesizerAsync(Sdkwork.CloudRouter.Open.Models.AlibabaSpeechRequest body)
        {
            return await _client.PostAsync<Sdkwork.CloudRouter.Open.Models.AlibabaSpeechResponse>("/alibaba/api/v1/services/audio/tts/SpeechSynthesizer", body, null, null, "application/json");
        }



    }
}
