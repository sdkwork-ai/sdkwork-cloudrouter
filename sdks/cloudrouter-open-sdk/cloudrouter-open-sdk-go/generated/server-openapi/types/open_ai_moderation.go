package types

// OpenAI-compatible moderation response.
type OpenAiModeration struct {
	Id string `json:"id"`
	Model string `json:"model"`
	Results []OpenAiModerationResult `json:"results"`
}
