using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminMonitorPerformanceItem
    {
        public double Cpu { get; set; }
        public double Memory { get; set; }
        public double Network { get; set; }
        public string Time { get; set; }
    }
}
