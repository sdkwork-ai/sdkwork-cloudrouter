using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class XaiVideoEditRequest
    {
        public string? Model { get; set; }
        public Dictionary<string, string>? Output { get; set; }
        public string Prompt { get; set; }
        public Dictionary<string, string>? StorageOptions { get; set; }
        public string? User { get; set; }
        public XaiVideoInput Video { get; set; }
    }
}
