package types

// OpenAI-compatible video object.
type OpenAiVideo struct {
	CompletedAt int `json:"completed_at"`
	ContentUrl string `json:"content_url"`
	CreatedAt int `json:"created_at"`
	Id string `json:"id"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Model string `json:"model"`
	Object string `json:"object"`
	Prompt string `json:"prompt"`
	Seconds int `json:"seconds"`
	Size string `json:"size"`
	Status string `json:"status"`
	Url string `json:"url"`
}
