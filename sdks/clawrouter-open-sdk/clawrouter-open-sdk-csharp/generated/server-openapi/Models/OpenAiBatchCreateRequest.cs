using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiBatchCreateRequest
    {
        public string CompletionWindow { get; set; }
        public string Endpoint { get; set; }
        public string InputFileId { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
    }
}
