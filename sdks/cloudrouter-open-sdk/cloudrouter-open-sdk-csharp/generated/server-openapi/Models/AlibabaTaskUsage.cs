using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class AlibabaTaskUsage
    {
        public int? SR { get; set; }
        public double? Duration { get; set; }
        public int? ImageCount { get; set; }
        public int? InputVideoDuration { get; set; }
        public int? OutputVideoDuration { get; set; }
        public string? Ratio { get; set; }
    }
}
