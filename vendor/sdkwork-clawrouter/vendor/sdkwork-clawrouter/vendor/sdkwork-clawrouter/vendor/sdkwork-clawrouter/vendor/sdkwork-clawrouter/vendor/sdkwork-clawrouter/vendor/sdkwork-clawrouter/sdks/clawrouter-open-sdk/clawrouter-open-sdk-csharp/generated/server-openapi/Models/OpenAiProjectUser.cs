using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiProjectUser
    {
        public int? CreatedAt { get; set; }
        public string? Email { get; set; }
        public string? Id { get; set; }
        public string? Name { get; set; }
        public string? Object { get; set; }
        public string? Role { get; set; }
    }
}
