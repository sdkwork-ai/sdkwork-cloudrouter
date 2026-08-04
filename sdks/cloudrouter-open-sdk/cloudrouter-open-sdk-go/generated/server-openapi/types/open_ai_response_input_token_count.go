package types

// OpenAI-compatible response input token count result.
type OpenAiResponseInputTokenCount struct {
	InputTokens int `json:"input_tokens"`
	InputTokensDetails OpenAiResponseInputTokensDetails `json:"input_tokens_details"`
	Model string `json:"model"`
	Object string `json:"object"`
}
