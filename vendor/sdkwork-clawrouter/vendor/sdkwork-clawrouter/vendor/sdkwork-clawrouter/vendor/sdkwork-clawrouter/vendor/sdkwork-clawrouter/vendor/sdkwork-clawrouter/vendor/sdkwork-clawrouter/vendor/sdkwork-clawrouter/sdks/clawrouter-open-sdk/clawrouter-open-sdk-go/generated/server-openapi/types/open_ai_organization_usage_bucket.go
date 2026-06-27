package types

// OpenAI-compatible organization usage bucket.
type OpenAiOrganizationUsageBucket struct {
	EndTime int `json:"end_time"`
	InputTokens int `json:"input_tokens"`
	NumRequests int `json:"num_requests"`
	Object string `json:"object"`
	OutputTokens int `json:"output_tokens"`
	Results []ProviderJsonValue `json:"results"`
	StartTime int `json:"start_time"`
}
