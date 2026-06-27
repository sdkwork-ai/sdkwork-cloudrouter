using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiAudioTranscriptionMultipartRequest
    {
        public string? File { get; set; }
        public string? Language { get; set; }
        public string? Model { get; set; }
        public string? Prompt { get; set; }
        public string? ResponseFormat { get; set; }
    }
}
