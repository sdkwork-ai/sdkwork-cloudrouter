using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiOrganizationInvite
    {
        public int? CreatedAt { get; set; }
        public string? Email { get; set; }
        public int? ExpiresAt { get; set; }
        public string? Id { get; set; }
        public string? Object { get; set; }
        public List<string>? Projects { get; set; }
        public string? Role { get; set; }
        public string? Status { get; set; }
    }
}
