using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class OpenAiRealtimeTranscriptionSessionCreateRequest
    {
        public List<string>? Include { get; set; }
        public string? InputAudioFormat { get; set; }
        public Dictionary<string, string>? InputAudioNoiseReduction { get; set; }
        public Dictionary<string, string>? InputAudioTranscription { get; set; }
        public Dictionary<string, string>? TurnDetection { get; set; }
    }
}
