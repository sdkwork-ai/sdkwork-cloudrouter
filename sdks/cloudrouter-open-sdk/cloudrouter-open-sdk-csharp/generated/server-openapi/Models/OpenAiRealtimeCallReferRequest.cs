using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class OpenAiRealtimeCallReferRequest
    {
        public Dictionary<string, string>? Metadata { get; set; }
        public string? Target { get; set; }
    }
}
