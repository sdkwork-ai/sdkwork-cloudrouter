using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiThreadMessageCreateRequest
    {
        public List<string>? Attachments { get; set; }
        public string? Content { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
        public string? Role { get; set; }
    }
}
