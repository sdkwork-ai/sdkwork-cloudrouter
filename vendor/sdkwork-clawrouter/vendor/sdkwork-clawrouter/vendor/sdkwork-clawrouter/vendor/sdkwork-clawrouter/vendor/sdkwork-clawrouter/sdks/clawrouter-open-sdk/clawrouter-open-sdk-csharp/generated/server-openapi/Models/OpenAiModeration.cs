using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiModeration
    {
        public string? Id { get; set; }
        public string? Model { get; set; }
        public List<OpenAiModerationResult>? Results { get; set; }
    }
}
