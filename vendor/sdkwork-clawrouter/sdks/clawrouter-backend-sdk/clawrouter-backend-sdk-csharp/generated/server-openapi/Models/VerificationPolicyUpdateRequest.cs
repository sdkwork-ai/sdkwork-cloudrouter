using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class VerificationPolicyUpdateRequest
    {
        public List<string> AllowedChannels { get; set; }
        public int CodeLength { get; set; }
        public string? DefaultChannel { get; set; }
        public int? MaxSendPerHour { get; set; }
        public int MaxVerifyAttempts { get; set; }
        public int? ResendIntervalSeconds { get; set; }
        public Dictionary<string, string>? RiskPolicy { get; set; }
        public string TemplateCode { get; set; }
        public int TtlSeconds { get; set; }
    }
}
