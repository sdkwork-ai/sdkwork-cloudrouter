using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Sdkwork.CloudRouter.Open.Models;
using SdkHttpClient = Sdkwork.CloudRouter.Open.Http.HttpClient;

namespace Sdkwork.CloudRouter.Open.Api
{
    public class AudioMinimaxApi
    {
        private readonly SdkHttpClient _client;

        public AudioMinimaxApi(SdkHttpClient client)
        {
            _client = client;
        }

        /// <summary>
        /// MiniMax speech synthesis
        /// </summary>
        public async Task<Sdkwork.CloudRouter.Open.Models.MinimaxTextToSpeechResponse?> CreateV1T2aVAsync(Sdkwork.CloudRouter.Open.Models.MinimaxTextToSpeechRequest body)
        {
            return await _client.PostAsync<Sdkwork.CloudRouter.Open.Models.MinimaxTextToSpeechResponse>("/minimax/v1/t2a_v2", body, null, null, "application/json");
        }



    }
}
