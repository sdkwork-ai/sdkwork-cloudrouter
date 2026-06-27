package types

// OpenAI-compatible certificate object.
type OpenAiCertificate struct {
	Active bool `json:"active"`
	Content string `json:"content"`
	CreatedAt int `json:"created_at"`
	ExpiresAt int `json:"expires_at"`
	Id string `json:"id"`
	Name string `json:"name"`
	Object string `json:"object"`
}
