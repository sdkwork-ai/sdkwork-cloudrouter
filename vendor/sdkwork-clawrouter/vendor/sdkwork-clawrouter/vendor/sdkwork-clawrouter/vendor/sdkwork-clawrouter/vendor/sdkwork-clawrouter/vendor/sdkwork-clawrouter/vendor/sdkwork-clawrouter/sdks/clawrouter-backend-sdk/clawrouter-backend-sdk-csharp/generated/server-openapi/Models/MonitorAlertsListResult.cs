using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class MonitorAlertsListResult
    {
        public string Code { get; set; }
        public AdminMonitorAlertsResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
