package types

// OpenAI-compatible container file object.
type OpenAiContainerFile struct {
	Bytes int `json:"bytes"`
	ContainerId string `json:"container_id"`
	CreatedAt int `json:"created_at"`
	Filename string `json:"filename"`
	Id string `json:"id"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Object string `json:"object"`
	Path string `json:"path"`
	Purpose string `json:"purpose"`
}
