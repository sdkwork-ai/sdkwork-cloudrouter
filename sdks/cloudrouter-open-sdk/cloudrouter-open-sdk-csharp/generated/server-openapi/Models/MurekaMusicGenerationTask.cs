using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class MurekaMusicGenerationTask
    {
        public string? AudioUrl { get; set; }
        public int? Duration { get; set; }
        public Dictionary<string, string>? Error { get; set; }
        public string? Id { get; set; }
        public string? Status { get; set; }
        public string? TaskId { get; set; }
        public string? Title { get; set; }
    }
}
