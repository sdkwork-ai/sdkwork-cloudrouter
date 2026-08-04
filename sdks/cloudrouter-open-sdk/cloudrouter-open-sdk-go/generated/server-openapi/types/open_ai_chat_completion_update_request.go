package types

// OpenAI-compatible request to update stored chat completion metadata.
type OpenAiChatCompletionUpdateRequest struct {
	Metadata map[string]ProviderJsonValue `json:"metadata"`
}
