package types

// Batch request processing counters.
type OpenAiBatchRequestCounts struct {
	Completed int `json:"completed"`
	Failed int `json:"failed"`
	Total int `json:"total"`
}
