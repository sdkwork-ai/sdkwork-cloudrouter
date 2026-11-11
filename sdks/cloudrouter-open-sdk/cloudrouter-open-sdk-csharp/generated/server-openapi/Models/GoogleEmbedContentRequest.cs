using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class GoogleEmbedContentRequest
    {
        public GoogleContent Content { get; set; }
        public Dictionary<string, string>? EmbedContentConfig { get; set; }
        public string? Model { get; set; }
        public int? OutputDimensionality { get; set; }
        public string? TaskType { get; set; }
        public string? Title { get; set; }
    }
}
