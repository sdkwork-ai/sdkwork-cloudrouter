using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class XaiVideoGenerationTask
    {
        public Dictionary<string, string>? Error { get; set; }
        public string? Model { get; set; }
        public int? Progress { get; set; }
        public string? RequestId { get; set; }
        public string Status { get; set; }
        public XaiUsage? Usage { get; set; }
        public XaiVideoUrl? Video { get; set; }
    }
}
