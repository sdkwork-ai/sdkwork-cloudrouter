using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiOrganizationInviteCreateRequest
    {
        public string? Email { get; set; }
        public List<string>? Projects { get; set; }
        public string? Role { get; set; }
    }
}
