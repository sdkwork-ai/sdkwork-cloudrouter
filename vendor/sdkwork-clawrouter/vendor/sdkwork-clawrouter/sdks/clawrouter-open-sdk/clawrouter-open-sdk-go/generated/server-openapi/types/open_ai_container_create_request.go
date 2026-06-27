package types

// OpenAI-compatible request to create a container.
type OpenAiContainerCreateRequest struct {
	FileIds []string `json:"file_ids"`
	MemoryLimit string `json:"memory_limit"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Name string `json:"name"`
}
