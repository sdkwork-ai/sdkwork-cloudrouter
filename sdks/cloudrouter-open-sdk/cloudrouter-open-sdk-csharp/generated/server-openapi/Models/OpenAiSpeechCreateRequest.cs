using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class OpenAiSpeechCreateRequest
    {
        public string Input { get; set; }
        public string? Instructions { get; set; }
        public string Model { get; set; }
        public string? ResponseFormat { get; set; }
        public double? Speed { get; set; }
        public string? StreamFormat { get; set; }
        public string Voice { get; set; }
    }
}
