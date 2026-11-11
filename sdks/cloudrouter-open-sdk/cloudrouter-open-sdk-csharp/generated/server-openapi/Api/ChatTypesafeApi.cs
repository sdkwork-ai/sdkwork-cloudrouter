using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Sdkwork.CloudRouter.Open.Models;
using SdkHttpClient = Sdkwork.CloudRouter.Open.Http.HttpClient;

namespace Sdkwork.CloudRouter.Open.Api
{
    public class ChatTypesafeApi
    {
        private readonly SdkHttpClient _client;

        public ChatTypesafeApi(SdkHttpClient client)
        {
            _client = client;
        }

        /// <summary>
        /// TypeSafe AI System One decision
        /// </summary>
        public async Task<Sdkwork.CloudRouter.Open.Models.TypeSafeSystemOneResponse?> CreateV1SystemoneAsync(Sdkwork.CloudRouter.Open.Models.TypeSafeSystemOneRequest body)
        {
            return await _client.PostAsync<Sdkwork.CloudRouter.Open.Models.TypeSafeSystemOneResponse>("/typesafe/v1/systemone", body, null, null, "application/json");
        }



    }
}
