using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class GoogleFunctionCall
    {
        public Dictionary<string, object>? Args { get; set; }
        public string? Name { get; set; }
    }
}
