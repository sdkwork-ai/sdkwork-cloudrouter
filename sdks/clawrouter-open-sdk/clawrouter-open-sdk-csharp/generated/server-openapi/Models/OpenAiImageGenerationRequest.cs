using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiImageGenerationRequest
    {
        public string Model { get; set; }
        public int? N { get; set; }
        public string Prompt { get; set; }
        public string? Quality { get; set; }
        public string? ResponseFormat { get; set; }
        public string? Size { get; set; }
    }
}
