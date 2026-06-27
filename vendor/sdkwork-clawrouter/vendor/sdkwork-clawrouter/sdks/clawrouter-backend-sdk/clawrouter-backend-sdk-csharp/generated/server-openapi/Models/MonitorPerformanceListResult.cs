using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class MonitorPerformanceListResult
    {
        public string Code { get; set; }
        public AdminMonitorPerformanceResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
