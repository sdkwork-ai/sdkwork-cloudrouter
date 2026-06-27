using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiRunSubmitToolOutputsRequest
    {
        public bool? Stream { get; set; }
        public List<string>? ToolOutputs { get; set; }
    }
}
