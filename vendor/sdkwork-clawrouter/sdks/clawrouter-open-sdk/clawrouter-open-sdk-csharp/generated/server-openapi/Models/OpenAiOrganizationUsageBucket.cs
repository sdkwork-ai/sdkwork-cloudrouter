using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiOrganizationUsageBucket
    {
        public int? EndTime { get; set; }
        public int? InputTokens { get; set; }
        public int? NumRequests { get; set; }
        public string? Object { get; set; }
        public int? OutputTokens { get; set; }
        public List<string>? Results { get; set; }
        public int? StartTime { get; set; }
    }
}
