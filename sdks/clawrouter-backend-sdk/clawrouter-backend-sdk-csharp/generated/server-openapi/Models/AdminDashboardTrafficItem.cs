using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminDashboardTrafficItem
    {
        public double Cost { get; set; }
        public double Requests { get; set; }
        public string Time { get; set; }
        public double Tokens { get; set; }
    }
}
