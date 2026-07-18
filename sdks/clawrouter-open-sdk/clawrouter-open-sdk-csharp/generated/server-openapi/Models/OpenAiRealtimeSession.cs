using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiRealtimeSession
    {
        public OpenAiRealtimeClientSecretValue? ClientSecret { get; set; }
        public string Id { get; set; }
        public string? Instructions { get; set; }
        public List<string>? Modalities { get; set; }
        public string? Model { get; set; }
        public string Object { get; set; }
        public string? Voice { get; set; }
    }
}
