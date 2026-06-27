using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiAudioTranscription
    {
        public double? Duration { get; set; }
        public string? Language { get; set; }
        public List<string>? Segments { get; set; }
        public string? Text { get; set; }
        public List<string>? Words { get; set; }
    }
}
