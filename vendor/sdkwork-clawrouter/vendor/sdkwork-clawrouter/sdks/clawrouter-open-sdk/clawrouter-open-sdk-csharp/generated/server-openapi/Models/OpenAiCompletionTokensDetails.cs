using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiCompletionTokensDetails
    {
        public int? AcceptedPredictionTokens { get; set; }
        public int? AudioTokens { get; set; }
        public int? ReasoningTokens { get; set; }
        public int? RejectedPredictionTokens { get; set; }
    }
}
