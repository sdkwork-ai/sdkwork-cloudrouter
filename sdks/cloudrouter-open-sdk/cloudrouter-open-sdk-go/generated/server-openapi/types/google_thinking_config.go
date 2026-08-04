package types

// Google Gemini google thinking config schema exposed by Cloud Router vendor routing.
type GoogleThinkingConfig struct {
	IncludeThoughts bool `json:"includeThoughts"`
	ThinkingBudget int `json:"thinkingBudget"`
}
