using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminMcpHealthCheckResponse
    {
        public string CheckedAt { get; set; }
        public string? ErrorMasked { get; set; }
        public string HealthStatus { get; set; }
        public bool Healthy { get; set; }
        public string? LatencyMs { get; set; }
        public string ServerId { get; set; }
    }
}
