using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiRole
    {
        public int? CreatedAt { get; set; }
        public string? Description { get; set; }
        public string? Id { get; set; }
        public string? Name { get; set; }
        public string? Object { get; set; }
        public List<string>? Permissions { get; set; }
    }
}
