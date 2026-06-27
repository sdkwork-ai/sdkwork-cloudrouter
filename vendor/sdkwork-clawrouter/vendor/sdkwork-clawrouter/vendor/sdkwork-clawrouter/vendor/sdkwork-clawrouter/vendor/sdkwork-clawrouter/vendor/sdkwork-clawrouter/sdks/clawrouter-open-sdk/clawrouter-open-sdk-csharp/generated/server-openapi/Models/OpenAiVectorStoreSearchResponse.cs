using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiVectorStoreSearchResponse
    {
        public List<OpenAiVectorStoreSearchResult>? Data { get; set; }
        public string? Object { get; set; }
        public List<string>? SearchQuery { get; set; }
    }
}
