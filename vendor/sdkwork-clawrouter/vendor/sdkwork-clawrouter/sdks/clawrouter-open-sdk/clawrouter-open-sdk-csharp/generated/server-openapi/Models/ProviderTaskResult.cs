using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class ProviderTaskResult
    {
        public List<ProviderGeneratedMedia>? Audios { get; set; }
        public List<VolcengineContentPart>? Content { get; set; }
        public string? Id { get; set; }
        public List<ProviderGeneratedMedia>? Images { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
        public string? Status { get; set; }
        public string? Text { get; set; }
        public List<ProviderGeneratedMedia>? Videos { get; set; }
    }
}
