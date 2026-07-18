using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiFunctionCall
    {
        public string Arguments { get; set; }
        public string Name { get; set; }
    }
}
