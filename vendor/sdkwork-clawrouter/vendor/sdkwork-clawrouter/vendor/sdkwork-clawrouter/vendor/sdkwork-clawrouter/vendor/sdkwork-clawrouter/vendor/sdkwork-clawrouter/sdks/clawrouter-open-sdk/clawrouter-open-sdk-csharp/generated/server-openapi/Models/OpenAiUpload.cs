using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiUpload
    {
        public int? Bytes { get; set; }
        public int? CreatedAt { get; set; }
        public int? ExpiresAt { get; set; }
        public OpenAiFile? File { get; set; }
        public string? Filename { get; set; }
        public string? Id { get; set; }
        public string? Object { get; set; }
        public string? Purpose { get; set; }
        public string? Status { get; set; }
    }
}
