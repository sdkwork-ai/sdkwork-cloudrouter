package types

// Single OpenAI-compatible moderation classification result.
type OpenAiModerationResult struct {
	Categories map[string]ProviderJsonValue `json:"categories"`
	CategoryScores map[string]float64 `json:"category_scores"`
	Flagged bool `json:"flagged"`
}
