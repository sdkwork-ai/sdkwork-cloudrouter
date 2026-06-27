using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class DashboardOverviewSummary
    {
        public string AudioRequests { get; set; }
        public double AvailableCredits { get; set; }
        public string ErrorCount { get; set; }
        public string ImageRequests { get; set; }
        public string MusicRequests { get; set; }
        public string RequestCount { get; set; }
        public double Rpm { get; set; }
        public string TotalRequestCount { get; set; }
        public double TotalUsedCredits { get; set; }
        public double Tpm { get; set; }
        public double UsedCredits { get; set; }
        public string VideoRequests { get; set; }
    }
}
