using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminPromptRenderRequest
    {
        public Dictionary<string, string>? Variables { get; set; }
    }
}
