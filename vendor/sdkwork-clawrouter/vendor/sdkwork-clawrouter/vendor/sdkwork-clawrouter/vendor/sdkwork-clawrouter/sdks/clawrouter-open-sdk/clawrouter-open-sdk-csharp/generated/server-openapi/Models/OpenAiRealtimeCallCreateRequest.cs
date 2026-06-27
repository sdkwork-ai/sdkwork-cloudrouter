using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiRealtimeCallCreateRequest
    {
        public Dictionary<string, string>? Metadata { get; set; }
        public string? Sdp { get; set; }
        public string? Session { get; set; }
    }
}
