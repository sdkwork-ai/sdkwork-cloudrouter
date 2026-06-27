using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminPieChartItem
    {
        public string Color { get; set; }
        public string Name { get; set; }
        public double Value { get; set; }
    }
}
