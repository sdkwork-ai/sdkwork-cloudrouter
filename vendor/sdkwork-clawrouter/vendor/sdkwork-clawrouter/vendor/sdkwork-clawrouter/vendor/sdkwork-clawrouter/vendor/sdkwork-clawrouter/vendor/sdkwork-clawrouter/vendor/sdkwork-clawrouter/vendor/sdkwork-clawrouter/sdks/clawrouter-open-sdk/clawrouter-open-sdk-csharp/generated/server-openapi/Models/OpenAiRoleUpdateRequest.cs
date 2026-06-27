using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiRoleUpdateRequest
    {
        public string? Description { get; set; }
        public string? Name { get; set; }
        public List<string>? Permissions { get; set; }
    }
}
