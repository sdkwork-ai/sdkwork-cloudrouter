using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiResponseInputTokenCount
    {
        public int? InputTokens { get; set; }
        public OpenAiResponseInputTokensDetails? InputTokensDetails { get; set; }
        public string? Model { get; set; }
        public string? Object { get; set; }
    }
}
