using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiFineTuningGraderRunResult
    {
        public string? Details { get; set; }
        public string? Feedback { get; set; }
        public bool? Passed { get; set; }
        public double? Score { get; set; }
    }
}
