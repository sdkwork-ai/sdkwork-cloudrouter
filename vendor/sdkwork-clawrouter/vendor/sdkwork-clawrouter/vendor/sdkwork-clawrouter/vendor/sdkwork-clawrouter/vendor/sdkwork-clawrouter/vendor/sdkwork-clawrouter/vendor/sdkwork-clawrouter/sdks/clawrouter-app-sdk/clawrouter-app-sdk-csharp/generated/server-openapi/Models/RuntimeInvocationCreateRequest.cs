using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class RuntimeInvocationCreateRequest
    {
        public string? AgentRunId { get; set; }
        public string? AgentRunStepId { get; set; }
        public string? AgentSessionId { get; set; }
        public string? ApprovalPolicy { get; set; }
        public string? ChatItemId { get; set; }
        public string? ChatTurnId { get; set; }
        public string? ConversationId { get; set; }
        public string? Cwd { get; set; }
        public string? Endpoint { get; set; }
        public string? InvocationType { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
        public string? Model { get; set; }
        public string? PermissionMode { get; set; }
        public string? Provider { get; set; }
        public Dictionary<string, string>? RequestJson { get; set; }
        public string Runtime { get; set; }
        public string? SandboxPolicy { get; set; }
        public string? Status { get; set; }
        public bool? Streaming { get; set; }
        public string? ToolCallId { get; set; }
        public string? ToolName { get; set; }
        public string? TraceId { get; set; }
    }
}
