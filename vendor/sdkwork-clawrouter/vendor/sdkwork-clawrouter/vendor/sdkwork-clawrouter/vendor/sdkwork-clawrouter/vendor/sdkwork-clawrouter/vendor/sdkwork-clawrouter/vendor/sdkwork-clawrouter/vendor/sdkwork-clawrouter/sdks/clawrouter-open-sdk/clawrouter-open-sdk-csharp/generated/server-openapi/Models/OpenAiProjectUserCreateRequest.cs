using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiProjectUserCreateRequest
    {
        public string? Role { get; set; }
        public string? UserId { get; set; }
    }
}
