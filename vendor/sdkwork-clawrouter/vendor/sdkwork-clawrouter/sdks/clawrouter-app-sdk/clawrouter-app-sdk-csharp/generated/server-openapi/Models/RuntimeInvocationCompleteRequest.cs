using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class RuntimeInvocationCompleteRequest
    {
        public string? ErrorCode { get; set; }
        public string? ErrorMessageMasked { get; set; }
        public string? ErrorType { get; set; }
        public string? ExitCode { get; set; }
        public string? FinishReason { get; set; }
        public string? LatencyMs { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
        public string? ProviderConversationId { get; set; }
        public string? ProviderResponseId { get; set; }
        public string? ProviderSessionId { get; set; }
        public string? ProviderStepId { get; set; }
        public Dictionary<string, string>? ResponseJson { get; set; }
        public string? Status { get; set; }
        public string? TtftMs { get; set; }
        public UsageSnapshot? UsageJson { get; set; }
    }
}
