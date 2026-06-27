using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class RuntimeInvocationItem
    {
        public string? AgentRunId { get; set; }
        public string? AgentRunStepId { get; set; }
        public string? AgentSessionId { get; set; }
        public string? ApprovalPolicy { get; set; }
        public string AttemptNo { get; set; }
        public string? ChatItemId { get; set; }
        public string? ChatTurnId { get; set; }
        public string? CompletedAt { get; set; }
        public string? ConversationId { get; set; }
        public string CreatedAt { get; set; }
        public string? Cwd { get; set; }
        public string? Endpoint { get; set; }
        public string? ErrorCode { get; set; }
        public string? ErrorMessageMasked { get; set; }
        public string? ErrorType { get; set; }
        public string? ExitCode { get; set; }
        public string? FinishReason { get; set; }
        public string Id { get; set; }
        public string InvocationNo { get; set; }
        public string InvocationType { get; set; }
        public string? LatencyMs { get; set; }
        public string? Model { get; set; }
        public string? PermissionMode { get; set; }
        public string? Provider { get; set; }
        public string? ProviderConversationId { get; set; }
        public string? ProviderResponseId { get; set; }
        public string? ProviderSessionId { get; set; }
        public string? ProviderStepId { get; set; }
        public string? RequestId { get; set; }
        public string Runtime { get; set; }
        public string? SandboxPolicy { get; set; }
        public string? StartedAt { get; set; }
        public string Status { get; set; }
        public bool Streaming { get; set; }
        public string? ToolCallId { get; set; }
        public string? ToolName { get; set; }
        public string? TraceId { get; set; }
        public string? TtftMs { get; set; }
    }
}
