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
        /// Minimax create music generation
        /// </summary>
        public async Task<Sdkwork.CloudRouter.Open.Models.MiniMaxMusicGenerationResponse?> CreateV1MusicGenerationAsync(Sdkwork.CloudRouter.Open.Models.MiniMaxMusicGenerationRequest body)
        {
            return await _client.PostAsync<Sdkwork.CloudRouter.Open.Models.MiniMaxMusicGenerationResponse>(ApiPaths.AiPath("/minimax/v1/music_generation"), body, null, null, "application/json");
        }



    }
}
