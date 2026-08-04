package types

// OpenAI-compatible reusable video character object.
type OpenAiVideoCharacter struct {
	CreatedAt int `json:"created_at"`
	Description string `json:"description"`
	Id string `json:"id"`
	ImageUrl string `json:"image_url"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Name string `json:"name"`
	Object string `json:"object"`
}
