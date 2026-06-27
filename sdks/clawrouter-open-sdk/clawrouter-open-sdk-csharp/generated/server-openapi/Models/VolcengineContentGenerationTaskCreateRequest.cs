using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class VolcengineContentGenerationTaskCreateRequest
    {
        public string? CallbackUrl { get; set; }
        public List<VolcengineContentPart>? Content { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
        public string? Model { get; set; }
    }
}
