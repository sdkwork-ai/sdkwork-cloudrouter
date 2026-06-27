using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class DashboardTopModel
    {
        public double Cost { get; set; }
        public bool IsUp { get; set; }
        public string Modality { get; set; }
        public string Name { get; set; }
        public string Rank { get; set; }
        public string Requests { get; set; }
        public string Supplier { get; set; }
        public string Trend { get; set; }
    }
}
