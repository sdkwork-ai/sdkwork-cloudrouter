package types

// OpenAI-compatible organization cost bucket.
type OpenAiOrganizationCostBucket struct {
	Amount float64 `json:"amount"`
	Currency string `json:"currency"`
	EndTime int `json:"end_time"`
	Object string `json:"object"`
	Results []ProviderJsonValue `json:"results"`
	StartTime int `json:"start_time"`
}
