package types

// OpenAI-compatible vector store file object.
type OpenAiVectorStoreFile struct {
	Attributes map[string]ProviderJsonValue `json:"attributes"`
	ChunkingStrategy ProviderJsonValue `json:"chunking_strategy"`
	CreatedAt int `json:"created_at"`
	Id string `json:"id"`
	LastError ProviderJsonValue `json:"last_error"`
	Object string `json:"object"`
	Status string `json:"status"`
	UsageBytes int `json:"usage_bytes"`
	VectorStoreId string `json:"vector_store_id"`
}
