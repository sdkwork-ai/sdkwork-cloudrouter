using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class GoogleCachedContent
    {
        public List<GoogleContent>? Contents { get; set; }
        public string? CreateTime { get; set; }
        public string? DisplayName { get; set; }
        public string? ExpireTime { get; set; }
        public string? Model { get; set; }
        public string? Name { get; set; }
        public GoogleContent? SystemInstruction { get; set; }
        public GoogleToolConfig? ToolConfig { get; set; }
        public List<GoogleTool>? Tools { get; set; }
        public string? UpdateTime { get; set; }
        public GoogleCachedContentUsageMetadata? UsageMetadata { get; set; }
    }
}
