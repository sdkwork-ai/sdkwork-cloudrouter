using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiRealtimeSessionCreateRequest
    {
        public string? Instructions { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
        public List<string>? Modalities { get; set; }
        public string? Model { get; set; }
        public string? Voice { get; set; }
    }
}
