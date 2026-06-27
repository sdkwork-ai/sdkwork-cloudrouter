using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiFineTuningJobCreateRequest
    {
        public string? Hyperparameters { get; set; }
        public List<string>? Integrations { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
        public string? Model { get; set; }
        public int? Seed { get; set; }
        public string? Suffix { get; set; }
        public string? TrainingFile { get; set; }
        public string? ValidationFile { get; set; }
    }
}
