package types

// OpenAI-compatible request to count tokens for a Responses API input.
type OpenAiResponseInputTokenCountRequest struct {
	Input string `json:"input"`
	Instructions string `json:"instructions"`
	Model string `json:"model"`
	Tools []ProviderJsonValue `json:"tools"`
}
