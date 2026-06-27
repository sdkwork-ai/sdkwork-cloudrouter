using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiOrganizationGroupCreateRequest
    {
        public string? Description { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
        public string? Name { get; set; }
    }
}
