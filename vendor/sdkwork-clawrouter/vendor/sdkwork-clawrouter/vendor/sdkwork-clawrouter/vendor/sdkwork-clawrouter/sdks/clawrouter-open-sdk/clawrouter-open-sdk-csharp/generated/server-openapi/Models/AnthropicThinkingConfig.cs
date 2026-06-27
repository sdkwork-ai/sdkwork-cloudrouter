using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class AnthropicThinkingConfig
    {
        public int? BudgetTokens { get; set; }
        public string? Type { get; set; }
    }
}
