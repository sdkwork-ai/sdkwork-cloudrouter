package types

// OpenAI-compatible request to create a thread message.
type OpenAiThreadMessageCreateRequest struct {
	Attachments []ProviderJsonValue `json:"attachments"`
	Content ProviderJsonValue `json:"content"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Role string `json:"role"`
}
