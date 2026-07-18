using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class AnthropicMessageBatchRequest
    {
        public string CustomId { get; set; }
        public AnthropicMessageCreateRequest Params { get; set; }
    }
}
