using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class GoogleContent
    {
        public List<GooglePart>? Parts { get; set; }
        public string? Role { get; set; }
    }
}
