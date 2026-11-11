using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class AnthropicSkill
    {
        public string SkillId { get; set; }
        public string Type { get; set; }
        public string? Version { get; set; }
    }
}
