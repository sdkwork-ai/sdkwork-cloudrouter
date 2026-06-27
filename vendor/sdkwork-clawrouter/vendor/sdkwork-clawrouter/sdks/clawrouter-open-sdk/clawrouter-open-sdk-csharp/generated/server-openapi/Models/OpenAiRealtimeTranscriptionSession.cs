using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiRealtimeTranscriptionSession
    {
        public OpenAiRealtimeClientSecretValue? ClientSecret { get; set; }
        public string? Id { get; set; }
        public string? InputAudioFormat { get; set; }
        public string? InputAudioTranscription { get; set; }
        public string? Object { get; set; }
    }
}
