using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class JimengVideoGenerationTask
    {
        public int? CreatedAt { get; set; }
        public Dictionary<string, string>? Error { get; set; }
        public string? Id { get; set; }
        public string? Status { get; set; }
        public string? TaskId { get; set; }
        public string? VideoUrl { get; set; }
    }
}
