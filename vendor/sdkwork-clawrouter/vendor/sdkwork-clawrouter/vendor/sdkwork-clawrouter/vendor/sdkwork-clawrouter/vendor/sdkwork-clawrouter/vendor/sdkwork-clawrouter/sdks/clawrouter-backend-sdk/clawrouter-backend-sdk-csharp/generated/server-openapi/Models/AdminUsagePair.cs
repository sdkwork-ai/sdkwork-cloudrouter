using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminUsagePair
    {
        public double Today { get; set; }
        public double Total { get; set; }
    }
}
