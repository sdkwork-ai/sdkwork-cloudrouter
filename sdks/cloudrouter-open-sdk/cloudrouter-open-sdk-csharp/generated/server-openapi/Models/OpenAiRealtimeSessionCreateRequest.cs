using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class OpenAiRealtimeSessionCreateRequest
    {
        public Dictionary<string, string> ClientSecret { get; set; }
        public string? InputAudioFormat { get; set; }
        public Dictionary<string, string>? InputAudioTranscription { get; set; }
        public string? Instructions { get; set; }
        public int? MaxResponseOutputTokens { get; set; }
        public List<string>? Modalities { get; set; }
        public string? OutputAudioFormat { get; set; }
        public Dictionary<string, string>? Prompt { get; set; }
        public double? Speed { get; set; }
        public double? Temperature { get; set; }
        public string? ToolChoice { get; set; }
        public List<Dictionary<string, string>>? Tools { get; set; }
        public Dictionary<string, string>? Tracing { get; set; }
        public Dictionary<string, string>? Truncation { get; set; }
        public Dictionary<string, string>? TurnDetection { get; set; }
        public string? Voice { get; set; }
    }
}
