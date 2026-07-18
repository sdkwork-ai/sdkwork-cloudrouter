using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiAssistant
    {
        public int CreatedAt { get; set; }
        public string? Description { get; set; }
        public string Id { get; set; }
        public string? Instructions { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
        public string Model { get; set; }
        public string? Name { get; set; }
        public string Object { get; set; }
        public string? ResponseFormat { get; set; }
        public double? Temperature { get; set; }
        public string? ToolResources { get; set; }
        public List<string>? Tools { get; set; }
        public double? TopP { get; set; }
    }
}
