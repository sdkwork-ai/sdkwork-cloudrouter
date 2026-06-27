using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiImage
    {
        public string? B64Json { get; set; }
        public string? MimeType { get; set; }
        public string? RevisedPrompt { get; set; }
        public string? Url { get; set; }
    }
}
