package types

// OpenAI-compatible request to attach a file to a vector store.
type OpenAiVectorStoreFileCreateRequest struct {
	Attributes map[string]ProviderJsonValue `json:"attributes"`
	ChunkingStrategy ProviderJsonValue `json:"chunking_strategy"`
	FileId string `json:"file_id"`
}
