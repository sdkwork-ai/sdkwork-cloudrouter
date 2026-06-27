using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminMonitorAlertItem
    {
        public string Id { get; set; }
        public string Message { get; set; }
        public string Severity { get; set; }
        public string Source { get; set; }
        public string Status { get; set; }
        public string Time { get; set; }
        public string Title { get; set; }
    }
}
