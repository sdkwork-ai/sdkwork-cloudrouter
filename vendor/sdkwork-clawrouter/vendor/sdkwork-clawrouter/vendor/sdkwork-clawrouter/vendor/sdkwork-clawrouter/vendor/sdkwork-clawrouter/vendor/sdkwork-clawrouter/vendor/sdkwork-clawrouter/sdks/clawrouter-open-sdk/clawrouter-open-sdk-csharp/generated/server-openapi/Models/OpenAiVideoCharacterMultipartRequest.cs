using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiVideoCharacterMultipartRequest
    {
        public string? Description { get; set; }
        public string? File { get; set; }
        public string? Image { get; set; }
        public string? Metadata { get; set; }
        public string? Name { get; set; }
    }
}
