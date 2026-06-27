using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class AnthropicContentSource
    {
        public string? Data { get; set; }
        public string? FileId { get; set; }
        public string? MediaType { get; set; }
        public string? Type { get; set; }
        public string? Url { get; set; }
    }
}
