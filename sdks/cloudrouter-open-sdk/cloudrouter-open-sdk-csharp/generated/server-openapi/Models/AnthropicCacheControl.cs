using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class AnthropicCacheControl
    {
        public string? Ttl { get; set; }
        public string Type { get; set; }
    }
}
