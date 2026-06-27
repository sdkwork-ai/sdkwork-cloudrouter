using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class GoogleSafetyRating
    {
        public bool? Blocked { get; set; }
        public string? Category { get; set; }
        public string? Probability { get; set; }
    }
}
