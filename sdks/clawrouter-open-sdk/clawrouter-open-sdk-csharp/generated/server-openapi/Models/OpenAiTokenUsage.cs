using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiTokenUsage
    {
        public int? CompletionTokens { get; set; }
        public OpenAiCompletionTokensDetails? CompletionTokensDetails { get; set; }
        public int? PromptTokens { get; set; }
        public OpenAiPromptTokensDetails? PromptTokensDetails { get; set; }
        public int? TotalTokens { get; set; }
    }
}
