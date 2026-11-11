using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class RunwayTaskAccepted
    {
        public Dictionary<string, string>? EstimatedCost { get; set; }
        public string Id { get; set; }
    }
}
