using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminMonitorAlertsResponse
    {
        public List<AdminMonitorAlertItem> Items { get; set; }
    }
}
