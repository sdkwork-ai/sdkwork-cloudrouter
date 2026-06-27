using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminMcpServerCreateRequest
    {
        public string? CategoryId { get; set; }
        public string? Description { get; set; }
        public string Name { get; set; }
        public string ServerKey { get; set; }
        public List<string>? Tags { get; set; }
        public string? Transport { get; set; }
        public string? Visibility { get; set; }
    }
}
