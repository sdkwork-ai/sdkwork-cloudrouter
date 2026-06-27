using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiOrganizationAuditLog
    {
        public string? Actor { get; set; }
        public string? ApiKeyId { get; set; }
        public int? EffectiveAt { get; set; }
        public string? Id { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
        public string? Object { get; set; }
        public string? Project { get; set; }
        public string? Request { get; set; }
        public string? Type { get; set; }
    }
}
