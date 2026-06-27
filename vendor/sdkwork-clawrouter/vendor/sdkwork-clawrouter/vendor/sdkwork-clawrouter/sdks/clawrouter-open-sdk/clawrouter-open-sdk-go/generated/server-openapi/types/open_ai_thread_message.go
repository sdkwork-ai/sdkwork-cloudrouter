package types

// OpenAI-compatible thread message object.
type OpenAiThreadMessage struct {
	AssistantId string `json:"assistant_id"`
	Attachments []ProviderJsonValue `json:"attachments"`
	CompletedAt int `json:"completed_at"`
	Content []ProviderJsonValue `json:"content"`
	CreatedAt int `json:"created_at"`
	Id string `json:"id"`
	IncompleteAt int `json:"incomplete_at"`
	IncompleteDetails ProviderJsonValue `json:"incomplete_details"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Object string `json:"object"`
	Role string `json:"role"`
	RunId string `json:"run_id"`
	Status string `json:"status"`
	ThreadId string `json:"thread_id"`
}
