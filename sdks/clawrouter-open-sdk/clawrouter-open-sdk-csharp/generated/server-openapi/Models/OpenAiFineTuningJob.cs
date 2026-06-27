using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiFineTuningJob
    {
        public int? CreatedAt { get; set; }
        public string? Error { get; set; }
        public string? FineTunedModel { get; set; }
        public int? FinishedAt { get; set; }
        public string? Hyperparameters { get; set; }
        public string? Id { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
        public string? Model { get; set; }
        public string? Object { get; set; }
        public string? OrganizationId { get; set; }
        public List<string>? ResultFiles { get; set; }
        public string? Status { get; set; }
        public int? TrainedTokens { get; set; }
        public string? TrainingFile { get; set; }
        public string? ValidationFile { get; set; }
    }
}
