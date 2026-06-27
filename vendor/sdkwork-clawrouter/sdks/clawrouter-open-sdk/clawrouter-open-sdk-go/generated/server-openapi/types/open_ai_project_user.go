package types

// OpenAI-compatible project user object.
type OpenAiProjectUser struct {
	CreatedAt int `json:"created_at"`
	Email string `json:"email"`
	Id string `json:"id"`
	Name string `json:"name"`
	Object string `json:"object"`
	Role string `json:"role"`
}
