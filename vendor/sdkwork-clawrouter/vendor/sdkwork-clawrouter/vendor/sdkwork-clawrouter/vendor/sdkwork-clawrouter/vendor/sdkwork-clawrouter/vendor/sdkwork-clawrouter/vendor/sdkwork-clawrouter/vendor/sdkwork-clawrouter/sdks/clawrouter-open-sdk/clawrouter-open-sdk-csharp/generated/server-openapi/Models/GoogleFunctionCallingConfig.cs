using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class GoogleFunctionCallingConfig
    {
        public List<string>? AllowedFunctionNames { get; set; }
        public string? Mode { get; set; }
    }
}
