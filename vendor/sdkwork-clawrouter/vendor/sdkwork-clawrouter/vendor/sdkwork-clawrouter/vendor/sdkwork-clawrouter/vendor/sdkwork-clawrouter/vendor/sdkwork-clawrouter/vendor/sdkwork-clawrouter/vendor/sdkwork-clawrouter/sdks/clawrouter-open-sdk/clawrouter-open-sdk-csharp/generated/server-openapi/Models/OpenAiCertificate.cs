using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiCertificate
    {
        public bool? Active { get; set; }
        public string? Content { get; set; }
        public int? CreatedAt { get; set; }
        public int? ExpiresAt { get; set; }
        public string? Id { get; set; }
        public string? Name { get; set; }
        public string? Object { get; set; }
    }
}
