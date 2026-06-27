using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiProjectRateLimitUpdateRequest
    {
        public int? Batch1DayMaxInputTokens { get; set; }
        public int? MaxImagesPer1Minute { get; set; }
        public int? MaxRequestsPer1Minute { get; set; }
        public int? MaxTokensPer1Minute { get; set; }
    }
}
