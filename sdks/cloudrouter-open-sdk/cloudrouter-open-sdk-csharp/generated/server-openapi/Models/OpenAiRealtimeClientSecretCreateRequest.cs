using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class OpenAiRealtimeClientSecretCreateRequest
    {
        public Dictionary<string, string>? ExpiresAfter { get; set; }
        public Dictionary<string, string>? Session { get; set; }
    }
}
