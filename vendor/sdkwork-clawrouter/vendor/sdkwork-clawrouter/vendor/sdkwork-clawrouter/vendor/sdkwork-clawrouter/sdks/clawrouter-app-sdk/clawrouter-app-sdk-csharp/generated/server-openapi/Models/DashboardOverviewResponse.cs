using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class DashboardOverviewResponse
    {
        public List<DashboardAnnouncement> Announcements { get; set; }
        public List<DashboardChartPoint> ChartData { get; set; }
        public List<DashboardConfigurationDomain>? ConfigurationDomains { get; set; }
        public List<DashboardSparklinePoint> MultimodalSparkline { get; set; }
        public List<DashboardSparklinePoint> PerformanceSparkline { get; set; }
        public List<DashboardSparklinePoint> RequestSparkline { get; set; }
        public DashboardOverviewSummary Summary { get; set; }
        public List<DashboardTopModel> TopModels { get; set; }
        public List<string> Warnings { get; set; }
    }
}
