package types

// Runtime invocation item schema exposed by Claw Router.
type RuntimeInvocationItem struct {
	AgentRunId string `json:"agentRunId"`
	AgentRunStepId string `json:"agentRunStepId"`
	AgentSessionId string `json:"agentSessionId"`
	ApprovalPolicy string `json:"approvalPolicy"`
	AttemptNo string `json:"attemptNo"`
	ChatItemId string `json:"chatItemId"`
	ChatTurnId string `json:"chatTurnId"`
	CompletedAt string `json:"completedAt"`
	ConversationId string `json:"conversationId"`
	CreatedAt string `json:"createdAt"`
	Cwd string `json:"cwd"`
	Endpoint string `json:"endpoint"`
	ErrorCode string `json:"errorCode"`
	ErrorMessageMasked string `json:"errorMessageMasked"`
	ErrorType string `json:"errorType"`
	ExitCode string `json:"exitCode"`
	FinishReason string `json:"finishReason"`
	Id string `json:"id"`
	InvocationNo string `json:"invocationNo"`
	InvocationType string `json:"invocationType"`
	LatencyMs string `json:"latencyMs"`
	Model string `json:"model"`
	PermissionMode string `json:"permissionMode"`
	Provider string `json:"provider"`
	ProviderConversationId string `json:"providerConversationId"`
	ProviderResponseId string `json:"providerResponseId"`
	ProviderSessionId string `json:"providerSessionId"`
	ProviderStepId string `json:"providerStepId"`
	RequestId string `json:"requestId"`
	Runtime string `json:"runtime"`
	SandboxPolicy string `json:"sandboxPolicy"`
	StartedAt string `json:"startedAt"`
	Status string `json:"status"`
	Streaming bool `json:"streaming"`
	ToolCallId string `json:"toolCallId"`
	ToolName string `json:"toolName"`
	TraceId string `json:"traceId"`
	TtftMs string `json:"ttftMs"`
}
