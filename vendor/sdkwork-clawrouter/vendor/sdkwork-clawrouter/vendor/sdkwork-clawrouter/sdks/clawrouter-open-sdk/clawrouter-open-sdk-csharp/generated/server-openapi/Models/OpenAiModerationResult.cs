using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiModerationResult
    {
        public Dictionary<string, string>? Categories { get; set; }
        public Dictionary<string, double>? CategoryScores { get; set; }
        public bool? Flagged { get; set; }
    }
}
