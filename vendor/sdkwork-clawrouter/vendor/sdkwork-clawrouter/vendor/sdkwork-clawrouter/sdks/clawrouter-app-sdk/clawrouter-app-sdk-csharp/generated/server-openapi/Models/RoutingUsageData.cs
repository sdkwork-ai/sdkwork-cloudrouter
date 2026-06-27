using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class RoutingUsageData
    {
        public string Latency { get; set; }
        public string Requests { get; set; }
        public string Time { get; set; }
    }
}
