using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiImageReferenceObject
    {
        public string? B64Json { get; set; }
        public string? Detail { get; set; }
        public string? FileId { get; set; }
        public string? MimeType { get; set; }
        public string? Url { get; set; }
    }
}
