using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class OpenAiContainerCreateRequest
    {
        public Dictionary<string, string>? ExpiresAfter { get; set; }
        public List<string>? FileIds { get; set; }
        public string? MemoryLimit { get; set; }
        public string? Name { get; set; }
        public Dictionary<string, string>? NetworkPolicy { get; set; }
        public List<Dictionary<string, string>>? Skills { get; set; }
    }
}
