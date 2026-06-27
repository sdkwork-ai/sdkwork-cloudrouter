package types

// Counts of eval run output item results.
type OpenAiEvalRunResultCounts struct {
	Errored int `json:"errored"`
	Failed int `json:"failed"`
	Passed int `json:"passed"`
	Total int `json:"total"`
}
