package types

// Usage snapshot schema exposed by Claw Router.
type UsageSnapshot struct {
	CachedTokens string `json:"cachedTokens"`
	InputTokens string `json:"inputTokens"`
	OutputTokens string `json:"outputTokens"`
	TotalTokens string `json:"totalTokens"`
}
