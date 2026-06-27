using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminDashboardRecentUsageItem
    {
        public string BillingMode { get; set; }
        public string Cost { get; set; }
        public string Id { get; set; }
        public bool IsApiUser { get; set; }
        public string Model { get; set; }
        public string Status { get; set; }
        public string Time { get; set; }
        public string Type { get; set; }
        public double? UsageCount { get; set; }
        public double? UsageIn { get; set; }
        public double? UsageOut { get; set; }
        public string User { get; set; }
    }
}
