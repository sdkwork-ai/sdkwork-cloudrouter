using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminCapacityPair
    {
        public double Total { get; set; }
        public double Used { get; set; }
    }
}
