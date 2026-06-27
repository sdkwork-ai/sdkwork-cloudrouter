using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class AnthropicMessageBatchRequestCounts
    {
        public int? Canceled { get; set; }
        public int? Errored { get; set; }
        public int? Expired { get; set; }
        public int? Processing { get; set; }
        public int? Succeeded { get; set; }
    }
}
