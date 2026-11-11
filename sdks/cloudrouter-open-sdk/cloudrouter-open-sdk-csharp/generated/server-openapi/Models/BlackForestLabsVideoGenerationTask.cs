using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class BlackForestLabsVideoGenerationTask
    {
        public Dictionary<string, string>? Details { get; set; }
        public string? Id { get; set; }
        public string? PollingUrl { get; set; }
        public double? Progress { get; set; }
        public Dictionary<string, string>? Result { get; set; }
        public string? Status { get; set; }
    }
}
