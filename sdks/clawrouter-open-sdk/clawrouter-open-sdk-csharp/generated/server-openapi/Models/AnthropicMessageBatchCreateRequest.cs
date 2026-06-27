using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class AnthropicMessageBatchCreateRequest
    {
        public List<AnthropicMessageBatchRequest>? Requests { get; set; }
    }
}
