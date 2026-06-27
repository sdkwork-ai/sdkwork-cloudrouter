using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiRealtimeTranscriptionSessionCreateRequest
    {
        public string? InputAudioFormat { get; set; }
        public string? InputAudioTranscription { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
        public string? Model { get; set; }
        public string? TurnDetection { get; set; }
    }
}
