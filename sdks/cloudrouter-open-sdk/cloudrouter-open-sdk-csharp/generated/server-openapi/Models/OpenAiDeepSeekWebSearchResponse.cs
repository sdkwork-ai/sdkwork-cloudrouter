using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class OpenAiDeepSeekWebSearchResponse
    {
        public List<OpenAiDeepSeekWebSearchResult> Results { get; set; }
    }
}
