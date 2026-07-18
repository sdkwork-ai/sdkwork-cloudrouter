using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiSpeechCreateRequest
    {
        public string Input { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
        public string Model { get; set; }
        public string? ResponseFormat { get; set; }
        public double? Speed { get; set; }
        public string Voice { get; set; }
    }
}
