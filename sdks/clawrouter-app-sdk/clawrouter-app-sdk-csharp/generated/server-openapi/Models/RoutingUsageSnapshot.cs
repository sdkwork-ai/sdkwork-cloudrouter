using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class RoutingUsageSnapshot
    {
        public List<RoutingUsageData> ChartData { get; set; }
        public List<RoutingModelStats> ModelStats { get; set; }
    }
}
