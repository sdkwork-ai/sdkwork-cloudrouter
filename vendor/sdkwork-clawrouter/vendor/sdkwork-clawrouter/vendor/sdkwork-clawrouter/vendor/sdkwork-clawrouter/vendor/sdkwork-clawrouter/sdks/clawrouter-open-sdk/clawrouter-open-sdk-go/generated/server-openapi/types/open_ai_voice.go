package types

// OpenAI-compatible voice object.
type OpenAiVoice struct {
	CreatedAt int `json:"created_at"`
	Description string `json:"description"`
	Id string `json:"id"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Name string `json:"name"`
	Object string `json:"object"`
	Status string `json:"status"`
}
