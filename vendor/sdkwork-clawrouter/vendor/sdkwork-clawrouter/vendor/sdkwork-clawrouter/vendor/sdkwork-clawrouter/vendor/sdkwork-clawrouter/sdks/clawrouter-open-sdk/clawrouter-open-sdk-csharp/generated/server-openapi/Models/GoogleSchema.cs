using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class GoogleSchema
    {
        public string? Description { get; set; }
        public List<string>? Enum { get; set; }
        public string? Format { get; set; }
        public object? Items { get; set; }
        public bool? Nullable { get; set; }
        public Dictionary<string, object>? Properties { get; set; }
        public List<string>? Required { get; set; }
        public string? Type { get; set; }
    }
}
