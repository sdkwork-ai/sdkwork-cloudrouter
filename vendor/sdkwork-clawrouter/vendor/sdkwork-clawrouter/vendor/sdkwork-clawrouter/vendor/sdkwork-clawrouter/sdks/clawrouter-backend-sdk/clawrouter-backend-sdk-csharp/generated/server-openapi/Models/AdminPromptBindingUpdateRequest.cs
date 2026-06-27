using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminPromptBindingUpdateRequest
    {
        public string? BindingRole { get; set; }
        public bool? Enabled { get; set; }
        public string? OwnerId { get; set; }
        public string? OwnerType { get; set; }
        public Dictionary<string, string>? PolicyJson { get; set; }
        public int? Priority { get; set; }
        public string? PromptVersionId { get; set; }
    }
}
