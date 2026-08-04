using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.CloudRouter.Open.Models
{
    public class OpenAiTool
    {
        public OpenAiFunctionDefinition? Function { get; set; }
        public string Type { get; set; }
    }
}
