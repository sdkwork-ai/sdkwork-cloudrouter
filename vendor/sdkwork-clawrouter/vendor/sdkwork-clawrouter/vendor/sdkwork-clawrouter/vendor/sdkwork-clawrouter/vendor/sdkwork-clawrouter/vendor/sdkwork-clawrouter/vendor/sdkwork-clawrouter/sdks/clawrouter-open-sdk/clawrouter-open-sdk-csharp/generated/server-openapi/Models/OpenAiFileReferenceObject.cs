using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiFileReferenceObject
    {
        public string? FileData { get; set; }
        public string? FileId { get; set; }
        public string? Filename { get; set; }
        public string? MimeType { get; set; }
        public string? Url { get; set; }
    }
}
