using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class AnthropicServerTool
    {
        public List<string>? AllowedCallers { get; set; }
        public List<string>? AllowedDomains { get; set; }
        public List<string>? BlockedDomains { get; set; }
        public AnthropicCacheControl? CacheControl { get; set; }
        public bool? DeferLoading { get; set; }
        public int? DisplayHeightPx { get; set; }
        public int? DisplayNumber { get; set; }
        public int? DisplayWidthPx { get; set; }
        public int? MaxCharacters { get; set; }
        public int? MaxUses { get; set; }
        public string Name { get; set; }
        public bool? Strict { get; set; }
        public string Type { get; set; }
        public Dictionary<string, string>? UserLocation { get; set; }
    }
}
