package types

// OpenAI-compatible open ai prompt tokens details schema exposed by Claw Router.
type OpenAiPromptTokensDetails struct {
	AudioTokens int `json:"audio_tokens"`
	CachedTokens int `json:"cached_tokens"`
}
