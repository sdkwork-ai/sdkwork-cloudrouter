using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class ArkImageGenerationData
    {
        public string? B64Json { get; set; }
        public Dictionary<string, string>? BoundingBox { get; set; }
        public string? Description { get; set; }
        public ProviderTaskError? Error { get; set; }
        public string? Name { get; set; }
        public string? OutputFormat { get; set; }
        public string? Size { get; set; }
        public string? Url { get; set; }
        public int? ZIndex { get; set; }
    }
}
