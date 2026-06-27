using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiModerationCreateRequest
    {
        public string? Input { get; set; }
        public string? Model { get; set; }
    }
}
