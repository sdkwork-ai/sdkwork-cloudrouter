using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class GoogleGenerationConfig
    {
        public int? CandidateCount { get; set; }
        public int? MaxOutputTokens { get; set; }
        public string? ResponseMimeType { get; set; }
        public GoogleSchema? ResponseSchema { get; set; }
        public List<string>? StopSequences { get; set; }
        public double? Temperature { get; set; }
        public GoogleThinkingConfig? ThinkingConfig { get; set; }
        public int? TopK { get; set; }
        public double? TopP { get; set; }
    }
}
