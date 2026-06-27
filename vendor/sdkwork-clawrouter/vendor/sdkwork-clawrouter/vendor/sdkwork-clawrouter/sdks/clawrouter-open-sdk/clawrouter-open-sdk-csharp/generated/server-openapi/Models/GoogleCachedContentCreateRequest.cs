using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class GoogleCachedContentCreateRequest
    {
        public List<GoogleContent>? Contents { get; set; }
        public string? DisplayName { get; set; }
        public string? ExpireTime { get; set; }
        public string? Model { get; set; }
        public GoogleContent? SystemInstruction { get; set; }
        public GoogleToolConfig? ToolConfig { get; set; }
        public List<GoogleTool>? Tools { get; set; }
        public string? Ttl { get; set; }
    }
}
