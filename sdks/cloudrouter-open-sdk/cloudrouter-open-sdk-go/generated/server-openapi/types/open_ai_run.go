package types

// OpenAI-compatible thread run object.
type OpenAiRun struct {
	AssistantId string `json:"assistant_id"`
	CancelledAt int `json:"cancelled_at"`
	CompletedAt int `json:"completed_at"`
	CreatedAt int `json:"created_at"`
	ExpiresAt int `json:"expires_at"`
	FailedAt int `json:"failed_at"`
	Id string `json:"id"`
	Instructions string `json:"instructions"`
	LastError ProviderJsonValue `json:"last_error"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Model string `json:"model"`
	Object string `json:"object"`
	RequiredAction ProviderJsonValue `json:"required_action"`
	StartedAt int `json:"started_at"`
	Status string `json:"status"`
	ThreadId string `json:"thread_id"`
	Tools []ProviderJsonValue `json:"tools"`
	Usage OpenAiTokenUsage `json:"usage"`
}
