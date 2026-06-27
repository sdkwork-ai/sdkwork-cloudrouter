package types

// OpenAI-compatible open ai response input tokens details schema exposed by Claw Router.
type OpenAiResponseInputTokensDetails struct {
	CachedTokens int `json:"cached_tokens"`
}
