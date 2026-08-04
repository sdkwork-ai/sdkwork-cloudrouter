package types

// OpenAI-compatible request to attach multiple files to a vector store.
type OpenAiVectorStoreFileBatchCreateRequest struct {
	Attributes map[string]ProviderJsonValue `json:"attributes"`
	ChunkingStrategy ProviderJsonValue `json:"chunking_strategy"`
	FileIds []string `json:"file_ids"`
}
