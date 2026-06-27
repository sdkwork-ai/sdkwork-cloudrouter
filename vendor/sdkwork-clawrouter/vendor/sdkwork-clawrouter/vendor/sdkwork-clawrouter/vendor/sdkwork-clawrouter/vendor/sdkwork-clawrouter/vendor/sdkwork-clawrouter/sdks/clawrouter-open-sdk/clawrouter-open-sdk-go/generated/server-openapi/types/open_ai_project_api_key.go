package types

// OpenAI-compatible project API key object.
type OpenAiProjectApiKey struct {
	CreatedAt int `json:"created_at"`
	Id string `json:"id"`
	LastUsedAt int `json:"last_used_at"`
	Name string `json:"name"`
	Object string `json:"object"`
	Owner ProviderJsonValue `json:"owner"`
	RedactedValue string `json:"redacted_value"`
}
