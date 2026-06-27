using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminMonitorNodeItem
    {
        public double Cpu { get; set; }
        public string Id { get; set; }
        public string Ip { get; set; }
        public double Memory { get; set; }
        public string Name { get; set; }
        public string Region { get; set; }
        public string Status { get; set; }
        public string Uptime { get; set; }
    }
}
