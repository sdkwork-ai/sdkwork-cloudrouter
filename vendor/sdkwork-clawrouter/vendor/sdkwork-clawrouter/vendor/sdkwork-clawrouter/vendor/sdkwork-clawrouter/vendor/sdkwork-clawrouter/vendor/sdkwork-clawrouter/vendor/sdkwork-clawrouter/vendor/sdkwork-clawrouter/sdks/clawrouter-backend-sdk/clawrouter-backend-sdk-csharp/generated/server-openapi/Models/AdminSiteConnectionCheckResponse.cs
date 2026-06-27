using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminSiteConnectionCheckResponse
    {
        public string CheckedAt { get; set; }
        public string HealthStatus { get; set; }
        public string? LatencyMs { get; set; }
        public string? Message { get; set; }
        public string SiteId { get; set; }
        public string Status { get; set; }
    }
}
