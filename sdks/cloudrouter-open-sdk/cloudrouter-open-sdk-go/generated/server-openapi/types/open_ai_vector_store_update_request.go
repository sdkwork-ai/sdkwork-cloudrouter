package types

// OpenAI-compatible request to update a vector store.
type OpenAiVectorStoreUpdateRequest struct {
	ExpiresAfter ProviderJsonValue `json:"expires_after"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Name string `json:"name"`
}
