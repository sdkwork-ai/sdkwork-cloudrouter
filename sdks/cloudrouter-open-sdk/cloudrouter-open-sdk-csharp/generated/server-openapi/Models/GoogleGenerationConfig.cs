using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class GoogleGenerationConfig
    {
        public Dictionary<string, string>? AudioTranscriptionConfig { get; set; }
        public int? CandidateCount { get; set; }
        public bool? EnableAffectiveDialog { get; set; }
        public bool? EnableEnhancedCivicAnswers { get; set; }
        public double? FrequencyPenalty { get; set; }
        public Dictionary<string, string>? ImageConfig { get; set; }
        public int? Logprobs { get; set; }
        public int? MaxOutputTokens { get; set; }
        public string? MediaResolution { get; set; }
        public double? PresencePenalty { get; set; }
        public Dictionary<string, string>? ResponseFormat { get; set; }
        public string? ResponseJsonSchema { get; set; }
        public bool? ResponseLogprobs { get; set; }
        public string? ResponseMimeType { get; set; }
        public List<string>? ResponseModalities { get; set; }
        public GoogleSchema? ResponseSchema { get; set; }
        public int? Seed { get; set; }
        public Dictionary<string, string>? SpeechConfig { get; set; }
        public List<string>? StopSequences { get; set; }
        public double? Temperature { get; set; }
        public GoogleThinkingConfig? ThinkingConfig { get; set; }
        public int? TopK { get; set; }
        public double? TopP { get; set; }
        public Dictionary<string, string>? TranslationConfig { get; set; }
    }
}
