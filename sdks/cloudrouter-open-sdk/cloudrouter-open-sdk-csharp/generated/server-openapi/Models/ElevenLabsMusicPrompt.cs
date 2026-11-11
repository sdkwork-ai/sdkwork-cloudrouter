using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class ElevenLabsMusicPrompt
    {
        public List<string> NegativeGlobalStyles { get; set; }
        public List<string> PositiveGlobalStyles { get; set; }
        public List<Dictionary<string, string>> Sections { get; set; }
    }
}
