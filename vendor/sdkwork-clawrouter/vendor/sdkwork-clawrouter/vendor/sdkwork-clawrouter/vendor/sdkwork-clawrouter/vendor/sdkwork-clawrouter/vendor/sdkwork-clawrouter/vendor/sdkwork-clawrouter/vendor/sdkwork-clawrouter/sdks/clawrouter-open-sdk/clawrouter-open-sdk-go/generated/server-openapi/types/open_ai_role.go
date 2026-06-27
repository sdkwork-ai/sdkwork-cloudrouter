package types

// OpenAI-compatible role object.
type OpenAiRole struct {
	CreatedAt int `json:"created_at"`
	Description string `json:"description"`
	Id string `json:"id"`
	Name string `json:"name"`
	Object string `json:"object"`
	Permissions []string `json:"permissions"`
}
