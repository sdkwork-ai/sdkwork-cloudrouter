using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiOrganizationUserUpdateRequest
    {
        public Dictionary<string, string>? Metadata { get; set; }
        public string? Role { get; set; }
    }
}
