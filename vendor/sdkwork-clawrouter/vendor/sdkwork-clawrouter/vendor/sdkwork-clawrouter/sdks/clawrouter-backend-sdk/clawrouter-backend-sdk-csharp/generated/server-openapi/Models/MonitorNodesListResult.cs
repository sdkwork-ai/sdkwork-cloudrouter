using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class MonitorNodesListResult
    {
        public string Code { get; set; }
        public AdminMonitorNodesResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
