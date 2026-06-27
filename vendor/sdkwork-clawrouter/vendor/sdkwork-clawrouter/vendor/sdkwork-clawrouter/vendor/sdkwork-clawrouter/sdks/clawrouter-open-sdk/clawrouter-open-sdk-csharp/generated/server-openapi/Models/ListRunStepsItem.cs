using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class ListRunStepsItem
    {
        public string? Content { get; set; }
        public int? Created { get; set; }
        public int? CreatedAt { get; set; }
        public string? Id { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
        public string? Model { get; set; }
        public string? Object { get; set; }
        public List<string>? Output { get; set; }
        public string? Role { get; set; }
        public string? Status { get; set; }
        public OpenAiTokenUsage? Usage { get; set; }
    }
}
