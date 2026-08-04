package types

// OpenAI-compatible container object.
type OpenAiContainer struct {
	CreatedAt int `json:"created_at"`
	ExpiresAt int `json:"expires_at"`
	Id string `json:"id"`
	LastActiveAt int `json:"last_active_at"`
	MemoryLimit string `json:"memory_limit"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Name string `json:"name"`
	Object string `json:"object"`
	Status string `json:"status"`
}
