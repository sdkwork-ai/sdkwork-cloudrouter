using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class RuntimeEventCreateRequest
    {
        public string? EventSource { get; set; }
        public string EventType { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
        public Dictionary<string, string>? PayloadJson { get; set; }
        public string? TextDelta { get; set; }
    }
}
