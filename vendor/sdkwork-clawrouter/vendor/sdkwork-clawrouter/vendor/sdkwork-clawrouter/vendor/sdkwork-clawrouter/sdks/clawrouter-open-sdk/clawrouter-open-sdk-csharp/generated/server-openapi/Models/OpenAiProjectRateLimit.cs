using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiProjectRateLimit
    {
        public int? Batch1DayMaxInputTokens { get; set; }
        public string? Id { get; set; }
        public int? MaxImagesPer1Minute { get; set; }
        public int? MaxRequestsPer1Minute { get; set; }
        public int? MaxTokensPer1Minute { get; set; }
        public string? Model { get; set; }
        public string? Object { get; set; }
    }
}
