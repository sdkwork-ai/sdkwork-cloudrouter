using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class AnthropicMessageBatch
    {
        public string? CancelInitiatedAt { get; set; }
        public string? CreatedAt { get; set; }
        public string? EndedAt { get; set; }
        public string? ExpiresAt { get; set; }
        public string? Id { get; set; }
        public string? ProcessingStatus { get; set; }
        public AnthropicMessageBatchRequestCounts? RequestCounts { get; set; }
        public string? ResultsUrl { get; set; }
        public string? Type { get; set; }
    }
}
