using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class AnthropicMessageParam
    {
        public string Content { get; set; }
        public string Role { get; set; }
    }
}
