package types

// Runtime invocation create request schema exposed by Claw Router.
type RuntimeInvocationCreateRequest struct {
	AgentRunId string `json:"agentRunId"`
	AgentRunStepId string `json:"agentRunStepId"`
	AgentSessionId string `json:"agentSessionId"`
	ApprovalPolicy string `json:"approvalPolicy"`
	ChatItemId string `json:"chatItemId"`
	ChatTurnId string `json:"chatTurnId"`
	ConversationId string `json:"conversationId"`
	Cwd string `json:"cwd"`
	Endpoint string `json:"endpoint"`
	InvocationType string `json:"invocationType"`
	Metadata map[string]JsonValue `json:"metadata"`
	Model string `json:"model"`
	PermissionMode string `json:"permissionMode"`
	Provider string `json:"provider"`
	RequestJson map[string]JsonValue `json:"requestJson"`
	Runtime string `json:"runtime"`
	SandboxPolicy string `json:"sandboxPolicy"`
	Status string `json:"status"`
	Streaming bool `json:"streaming"`
	ToolCallId string `json:"toolCallId"`
	ToolName string `json:"toolName"`
	TraceId string `json:"traceId"`
}
