using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class OpenAiDeepSeekWebSearchRequest
    {
        public int? Count { get; set; }
        public string? Localization { get; set; }
        public bool? NeedContent { get; set; }
        public string? OriQuestion { get; set; }
        public string Query { get; set; }
    }
}
