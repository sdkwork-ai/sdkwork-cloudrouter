using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class RuntimeEventItem
    {
        public string CreatedAt { get; set; }
        public string EventNo { get; set; }
        public string EventSource { get; set; }
        public string EventType { get; set; }
        public string Id { get; set; }
        public string InvocationId { get; set; }
        public Dictionary<string, string> PayloadJson { get; set; }
        public string? TextDelta { get; set; }
    }
}
