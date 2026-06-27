using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiResponseUsage
    {
        public int? InputTokens { get; set; }
        public OpenAiResponseInputTokensDetails? InputTokensDetails { get; set; }
        public int? OutputTokens { get; set; }
        public OpenAiResponseOutputTokensDetails? OutputTokensDetails { get; set; }
        public int? TotalTokens { get; set; }
    }
}
