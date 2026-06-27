package types

// OpenAI-compatible request to update a thread message.
type OpenAiThreadMessageUpdateRequest struct {
	Metadata map[string]ProviderJsonValue `json:"metadata"`
}
