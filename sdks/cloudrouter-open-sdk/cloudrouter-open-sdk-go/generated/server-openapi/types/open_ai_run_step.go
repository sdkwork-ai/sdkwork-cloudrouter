package types

// OpenAI-compatible run step object.
type OpenAiRunStep struct {
	AssistantId string `json:"assistant_id"`
	CancelledAt int `json:"cancelled_at"`
	CompletedAt int `json:"completed_at"`
	CreatedAt int `json:"created_at"`
	ExpiredAt int `json:"expired_at"`
	FailedAt int `json:"failed_at"`
	Id string `json:"id"`
	LastError ProviderJsonValue `json:"last_error"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Object string `json:"object"`
	RunId string `json:"run_id"`
	Status string `json:"status"`
	StepDetails ProviderJsonValue `json:"step_details"`
	ThreadId string `json:"thread_id"`
	Type string `json:"type"`
	Usage OpenAiTokenUsage `json:"usage"`
}
