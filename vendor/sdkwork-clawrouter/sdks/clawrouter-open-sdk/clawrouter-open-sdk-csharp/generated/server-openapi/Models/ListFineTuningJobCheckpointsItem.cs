using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class ListFineTuningJobCheckpointsItem
    {
        public int? Created { get; set; }
        public int? CreatedAt { get; set; }
        public string? FineTunedModel { get; set; }
        public string? Id { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
        public string? Model { get; set; }
        public string? Object { get; set; }
        public List<string>? ResultFiles { get; set; }
        public string? Status { get; set; }
        public string? TrainingFile { get; set; }
    }
}
