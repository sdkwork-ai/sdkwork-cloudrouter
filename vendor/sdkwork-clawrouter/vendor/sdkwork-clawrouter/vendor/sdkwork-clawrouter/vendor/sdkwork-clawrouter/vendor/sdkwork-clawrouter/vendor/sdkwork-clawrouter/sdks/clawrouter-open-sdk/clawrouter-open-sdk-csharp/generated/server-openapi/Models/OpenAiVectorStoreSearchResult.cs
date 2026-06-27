using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiVectorStoreSearchResult
    {
        public Dictionary<string, string>? Attributes { get; set; }
        public List<string>? Content { get; set; }
        public string? FileId { get; set; }
        public string? Filename { get; set; }
        public double? Score { get; set; }
    }
}
