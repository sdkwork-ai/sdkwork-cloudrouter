using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminPromptVersionCreateRequest
    {
        public string Content { get; set; }
        public List<Dictionary<string, string>>? ExamplesJson { get; set; }
        public Dictionary<string, string>? ModelConstraints { get; set; }
        public Dictionary<string, string>? OutputSchema { get; set; }
        public Dictionary<string, string>? SafetyPolicy { get; set; }
        public string Title { get; set; }
        public Dictionary<string, string>? VariableSchema { get; set; }
        public string VersionNo { get; set; }
    }
}
