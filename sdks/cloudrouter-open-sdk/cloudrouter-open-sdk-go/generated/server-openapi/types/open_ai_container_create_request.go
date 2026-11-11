package types

// OpenAI-compatible request to create a container.
type OpenAiContainerCreateRequest struct {
	ExpiresAfter map[string]ProviderJsonValue `json:"expires_after"`
	FileIds []string `json:"file_ids"`
	MemoryLimit string `json:"memory_limit"`
	Name string `json:"name"`
	NetworkPolicy map[string]ProviderJsonValue `json:"network_policy"`
	Skills []map[string]ProviderJsonValue `json:"skills"`
}
