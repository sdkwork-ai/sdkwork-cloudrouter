using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiProjectServiceAccountCreateRequest
    {
        public string? Name { get; set; }
        public string? Role { get; set; }
    }
}
