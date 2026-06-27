using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiOrganizationCostBucket
    {
        public double? Amount { get; set; }
        public string? Currency { get; set; }
        public int? EndTime { get; set; }
        public string? Object { get; set; }
        public List<string>? Results { get; set; }
        public int? StartTime { get; set; }
    }
}
