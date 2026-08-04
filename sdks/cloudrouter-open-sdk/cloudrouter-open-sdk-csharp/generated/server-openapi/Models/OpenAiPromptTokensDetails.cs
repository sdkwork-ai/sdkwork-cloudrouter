using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class OpenAiPromptTokensDetails
    {
        public int? AudioTokens { get; set; }
        public int? CachedTokens { get; set; }
    }
}
