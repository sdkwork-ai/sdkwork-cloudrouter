using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiUploadCreateRequest
    {
        public int? Bytes { get; set; }
        public string? Filename { get; set; }
        public string? MimeType { get; set; }
        public string? Purpose { get; set; }
    }
}
