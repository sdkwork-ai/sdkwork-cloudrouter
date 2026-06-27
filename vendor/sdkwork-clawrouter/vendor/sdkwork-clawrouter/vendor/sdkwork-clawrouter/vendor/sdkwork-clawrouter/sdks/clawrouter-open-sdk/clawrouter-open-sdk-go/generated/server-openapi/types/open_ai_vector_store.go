package types

// OpenAI-compatible vector store object.
type OpenAiVectorStore struct {
	Bytes int `json:"bytes"`
	CreatedAt int `json:"created_at"`
	ExpiresAfter ProviderJsonValue `json:"expires_after"`
	ExpiresAt int `json:"expires_at"`
	FileCounts OpenAiVectorStoreFileCounts `json:"file_counts"`
	Id string `json:"id"`
	LastActiveAt int `json:"last_active_at"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Name string `json:"name"`
	Object string `json:"object"`
	Status string `json:"status"`
	UsageBytes int `json:"usage_bytes"`
}
