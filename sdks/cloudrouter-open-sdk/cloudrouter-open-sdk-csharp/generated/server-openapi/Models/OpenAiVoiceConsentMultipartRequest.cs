using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class OpenAiVoiceConsentMultipartRequest
    {
        public string File { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
        public string? Name { get; set; }
    }
}
