using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminMonitorNodesResponse
    {
        public List<AdminMonitorNodeItem> Items { get; set; }
    }
}
