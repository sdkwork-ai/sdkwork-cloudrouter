using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiEmbeddingUsage
    {
        public int? PromptTokens { get; set; }
        public int? TotalTokens { get; set; }
    }
}
