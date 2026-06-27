package types

// Anthropic Claude anthropic message batch schema exposed by Claw Router vendor routing.
type AnthropicMessageBatch struct {
	CancelInitiatedAt string `json:"cancel_initiated_at"`
	CreatedAt string `json:"created_at"`
	EndedAt string `json:"ended_at"`
	ExpiresAt string `json:"expires_at"`
	Id string `json:"id"`
	ProcessingStatus string `json:"processing_status"`
	RequestCounts AnthropicMessageBatchRequestCounts `json:"request_counts"`
	ResultsUrl string `json:"results_url"`
	Type string `json:"type"`
}
