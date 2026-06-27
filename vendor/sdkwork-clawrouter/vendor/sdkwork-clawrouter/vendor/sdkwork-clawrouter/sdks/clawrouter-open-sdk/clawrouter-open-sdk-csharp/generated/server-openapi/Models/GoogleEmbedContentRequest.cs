using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class GoogleEmbedContentRequest
    {
        public GoogleContent? Content { get; set; }
        public int? OutputDimensionality { get; set; }
        public string? TaskType { get; set; }
        public string? Title { get; set; }
    }
}
