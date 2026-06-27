using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class GoogleGenerateContentRequest
    {
        public string? CachedContent { get; set; }
        public List<GoogleContent>? Contents { get; set; }
        public GoogleGenerationConfig? GenerationConfig { get; set; }
        public List<GoogleSafetySetting>? SafetySettings { get; set; }
        public GoogleContent? SystemInstruction { get; set; }
        public GoogleToolConfig? ToolConfig { get; set; }
        public List<GoogleTool>? Tools { get; set; }
    }
}
