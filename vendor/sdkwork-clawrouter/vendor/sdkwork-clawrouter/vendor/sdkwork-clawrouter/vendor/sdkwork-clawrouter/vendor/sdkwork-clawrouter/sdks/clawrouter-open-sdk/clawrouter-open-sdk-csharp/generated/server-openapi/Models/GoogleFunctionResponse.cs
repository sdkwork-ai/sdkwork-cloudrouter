using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class GoogleFunctionResponse
    {
        public string? Name { get; set; }
        public Dictionary<string, object>? Response { get; set; }
    }
}
