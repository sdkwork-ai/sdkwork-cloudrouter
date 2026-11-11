package types

// xAI usage block. cost_in_usd_ticks is the authoritative charge: divide by 10,000,000 for USD.
type XaiUsage struct {
	CompletionTokens int `json:"completion_tokens"`
	CostInUsdTicks int `json:"cost_in_usd_ticks"`
	NumSourcesUsed int `json:"num_sources_used"`
	PromptTokens int `json:"prompt_tokens"`
	TotalTokens int `json:"total_tokens"`
}
