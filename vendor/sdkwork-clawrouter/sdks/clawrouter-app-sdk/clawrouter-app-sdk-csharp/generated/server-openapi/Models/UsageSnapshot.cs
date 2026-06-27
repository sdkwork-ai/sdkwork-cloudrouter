using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class UsageSnapshot
    {
        public string? CachedTokens { get; set; }
        public string? InputTokens { get; set; }
        public string? OutputTokens { get; set; }
        public string? TotalTokens { get; set; }
    }
}
