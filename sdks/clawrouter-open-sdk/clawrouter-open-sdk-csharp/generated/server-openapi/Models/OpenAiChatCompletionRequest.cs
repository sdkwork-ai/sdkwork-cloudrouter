using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiChatCompletionRequest
    {
        public OpenAiChatAudioConfig? Audio { get; set; }
        public double? FrequencyPenalty { get; set; }
        public OpenAiFunctionCallChoice? FunctionCall { get; set; }
        public List<OpenAiFunctionDefinition>? Functions { get; set; }
        public Dictionary<string, double>? LogitBias { get; set; }
        public bool? Logprobs { get; set; }
        public int? MaxCompletionTokens { get; set; }
        public int? MaxTokens { get; set; }
        public List<OpenAiChatMessage> Messages { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
        public List<string>? Modalities { get; set; }
        public string Model { get; set; }
        public int? N { get; set; }
        public bool? ParallelToolCalls { get; set; }
        public OpenAiPredictionConfig? Prediction { get; set; }
        public double? PresencePenalty { get; set; }
        public string? ReasoningEffort { get; set; }
        public OpenAiResponseFormat? ResponseFormat { get; set; }
        public int? Seed { get; set; }
        public string? ServiceTier { get; set; }
        public string? Stop { get; set; }
        public bool? Store { get; set; }
        public bool? Stream { get; set; }
        public OpenAiStreamOptions? StreamOptions { get; set; }
        public double? Temperature { get; set; }
        public OpenAiToolChoice? ToolChoice { get; set; }
        public List<OpenAiTool>? Tools { get; set; }
        public int? TopLogprobs { get; set; }
        public double? TopP { get; set; }
        public string? User { get; set; }
    }
}
