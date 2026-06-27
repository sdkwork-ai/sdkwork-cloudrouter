using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiProjectApiKey
    {
        public int? CreatedAt { get; set; }
        public string? Id { get; set; }
        public int? LastUsedAt { get; set; }
        public string? Name { get; set; }
        public string? Object { get; set; }
        public string? Owner { get; set; }
        public string? RedactedValue { get; set; }
    }
}
