package types

// Anthropic Claude anthropic thinking config schema exposed by Cloud Router vendor routing.
type AnthropicThinkingConfig struct {
	BudgetTokens int `json:"budget_tokens"`
	Display string `json:"display"`
	Type string `json:"type"`
}
