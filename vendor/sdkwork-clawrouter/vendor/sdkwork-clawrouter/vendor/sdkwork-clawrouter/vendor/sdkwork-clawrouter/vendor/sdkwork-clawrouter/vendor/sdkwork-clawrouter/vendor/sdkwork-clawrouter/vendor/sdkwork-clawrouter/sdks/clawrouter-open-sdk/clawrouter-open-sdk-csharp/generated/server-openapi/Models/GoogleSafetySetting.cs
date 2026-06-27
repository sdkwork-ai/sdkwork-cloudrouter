using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class GoogleSafetySetting
    {
        public string? Category { get; set; }
        public string? Threshold { get; set; }
    }
}
