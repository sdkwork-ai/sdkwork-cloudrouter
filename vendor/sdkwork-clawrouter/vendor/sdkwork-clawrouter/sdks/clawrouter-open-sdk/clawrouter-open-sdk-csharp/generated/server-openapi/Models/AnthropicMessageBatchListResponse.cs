using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class AnthropicMessageBatchListResponse
    {
        public List<AnthropicMessageBatch>? Data { get; set; }
        public string? FirstId { get; set; }
        public bool? HasMore { get; set; }
        public string? LastId { get; set; }
    }
}
