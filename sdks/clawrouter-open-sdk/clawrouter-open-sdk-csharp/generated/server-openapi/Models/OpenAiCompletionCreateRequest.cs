using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiCompletionCreateRequest
    {
        public int? BestOf { get; set; }
        public bool? Echo { get; set; }
        public double? FrequencyPenalty { get; set; }
        public Dictionary<string, double>? LogitBias { get; set; }
        public int? Logprobs { get; set; }
        public int? MaxTokens { get; set; }
        public string Model { get; set; }
        public int? N { get; set; }
        public double? PresencePenalty { get; set; }
        public string Prompt { get; set; }
        public int? Seed { get; set; }
        public string? Stop { get; set; }
        public bool? Stream { get; set; }
        public string? Suffix { get; set; }
        public double? Temperature { get; set; }
        public double? TopP { get; set; }
        public string? User { get; set; }
    }
}
