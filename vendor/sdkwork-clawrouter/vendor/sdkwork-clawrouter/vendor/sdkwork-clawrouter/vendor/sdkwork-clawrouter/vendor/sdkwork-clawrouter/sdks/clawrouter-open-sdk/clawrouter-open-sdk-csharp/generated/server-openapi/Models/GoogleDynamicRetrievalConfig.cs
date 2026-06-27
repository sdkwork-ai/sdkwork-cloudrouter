using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class GoogleDynamicRetrievalConfig
    {
        public double? DynamicThreshold { get; set; }
        public string? Mode { get; set; }
    }
}
