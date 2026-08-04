package types

// OpenAI-compatible request to update a thread run.
type OpenAiRunUpdateRequest struct {
	Metadata map[string]ProviderJsonValue `json:"metadata"`
}
