using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class ElevenLabsCompositionPlan
    {
        public List<Dictionary<string, string>> Chunks { get; set; }
    }
}
