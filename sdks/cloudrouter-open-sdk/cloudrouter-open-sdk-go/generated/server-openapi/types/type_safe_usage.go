package types

// Type safe usage schema exposed by Cloud Router.
type TypeSafeUsage struct {
	InputTokens int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
}
