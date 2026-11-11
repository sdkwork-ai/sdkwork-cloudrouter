using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class TypeSafeQuestion
    {
        public string? Criteria { get; set; }
        public string Instructions { get; set; }
        public string Type { get; set; }
    }
}
