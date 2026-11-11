using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class AnthropicContainer
    {
        public string? Id { get; set; }
        public List<AnthropicSkill>? Skills { get; set; }
    }
}
