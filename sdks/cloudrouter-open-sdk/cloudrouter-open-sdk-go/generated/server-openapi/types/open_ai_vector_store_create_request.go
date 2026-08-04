package types

// OpenAI-compatible request to create a vector store.
type OpenAiVectorStoreCreateRequest struct {
	ChunkingStrategy ProviderJsonValue `json:"chunking_strategy"`
	ExpiresAfter ProviderJsonValue `json:"expires_after"`
	FileIds []string `json:"file_ids"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Name string `json:"name"`
}
