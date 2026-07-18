using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiEmbeddingsRequest
    {
        public int? Dimensions { get; set; }
        public string? EncodingFormat { get; set; }
        public string Input { get; set; }
        public string Model { get; set; }
        public string? User { get; set; }
    }
}
