package types

// Anthropic Claude anthropic thinking config schema exposed by Claw Router vendor routing.
type AnthropicThinkingConfig struct {
	BudgetTokens int `json:"budget_tokens"`
	Type string `json:"type"`
}
