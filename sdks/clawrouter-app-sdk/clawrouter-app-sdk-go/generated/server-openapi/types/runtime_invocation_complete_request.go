package types

// Runtime invocation complete request schema exposed by Claw Router.
type RuntimeInvocationCompleteRequest struct {
	ErrorCode string `json:"errorCode"`
	ErrorMessageMasked string `json:"errorMessageMasked"`
	ErrorType string `json:"errorType"`
	ExitCode string `json:"exitCode"`
	FinishReason string `json:"finishReason"`
	LatencyMs string `json:"latencyMs"`
	Metadata map[string]JsonValue `json:"metadata"`
	ProviderConversationId string `json:"providerConversationId"`
	ProviderResponseId string `json:"providerResponseId"`
	ProviderSessionId string `json:"providerSessionId"`
	ProviderStepId string `json:"providerStepId"`
	ResponseJson map[string]JsonValue `json:"responseJson"`
	Status string `json:"status"`
	TtftMs string `json:"ttftMs"`
	UsageJson UsageSnapshot `json:"usageJson"`
}
