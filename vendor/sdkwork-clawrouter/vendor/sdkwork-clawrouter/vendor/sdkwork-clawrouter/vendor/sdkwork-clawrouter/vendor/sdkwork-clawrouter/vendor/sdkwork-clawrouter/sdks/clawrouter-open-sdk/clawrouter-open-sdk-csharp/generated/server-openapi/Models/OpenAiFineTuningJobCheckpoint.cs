using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiFineTuningJobCheckpoint
    {
        public int? CreatedAt { get; set; }
        public string? FineTunedModelCheckpoint { get; set; }
        public string? FineTuningJobId { get; set; }
        public string? Id { get; set; }
        public string? Metrics { get; set; }
        public string? Object { get; set; }
        public int? StepNumber { get; set; }
    }
}
