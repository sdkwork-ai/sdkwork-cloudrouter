using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Open.Models
{
    public class OpenAiBatch
    {
        public int? CancelledAt { get; set; }
        public int? CancellingAt { get; set; }
        public int? CompletedAt { get; set; }
        public string? CompletionWindow { get; set; }
        public int? CreatedAt { get; set; }
        public string? Endpoint { get; set; }
        public string? ErrorFileId { get; set; }
        public string? Errors { get; set; }
        public int? ExpiredAt { get; set; }
        public int? ExpiresAt { get; set; }
        public int? FailedAt { get; set; }
        public int? FinalizingAt { get; set; }
        public string? Id { get; set; }
        public int? InProgressAt { get; set; }
        public string? InputFileId { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
        public string? Object { get; set; }
        public string? OutputFileId { get; set; }
        public OpenAiBatchRequestCounts? RequestCounts { get; set; }
        public string? Status { get; set; }
    }
}
