using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminDashboardDataResponse
    {
        public string ActiveUsers { get; set; }
        public List<AdminPieChartItem> ModelDistribution { get; set; }
        public List<AdminPieChartItem> Multimodal { get; set; }
        public List<AdminDashboardRecentUsageItem> RecentUsage { get; set; }
        public List<AdminDashboardTrafficItem> Traffic { get; set; }
        public List<AdminPieChartItem> UserConsumption { get; set; }
    }
}
