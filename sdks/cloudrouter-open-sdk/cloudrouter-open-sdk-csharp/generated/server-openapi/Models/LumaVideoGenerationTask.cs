using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class LumaVideoGenerationTask
    {
        public LumaGenerationAssets? Assets { get; set; }
        public string? CreatedAt { get; set; }
        public string? FailureReason { get; set; }
        public string? GenerationType { get; set; }
        public string? Id { get; set; }
        public string? Model { get; set; }
        public Dictionary<string, string>? Request { get; set; }
        public string? State { get; set; }
    }
}
