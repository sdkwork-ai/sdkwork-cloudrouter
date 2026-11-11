using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class PixverseErrorDetail
    {
        public string? Message { get; set; }
        public Dictionary<string, string>? Param { get; set; }
        public string? Type { get; set; }
    }
}
