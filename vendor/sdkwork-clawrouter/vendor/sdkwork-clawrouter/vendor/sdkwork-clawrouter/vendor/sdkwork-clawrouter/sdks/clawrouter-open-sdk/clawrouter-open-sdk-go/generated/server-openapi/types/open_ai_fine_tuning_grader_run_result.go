package types

// OpenAI-compatible fine-tuning grader run result.
type OpenAiFineTuningGraderRunResult struct {
	Details ProviderJsonValue `json:"details"`
	Feedback string `json:"feedback"`
	Passed bool `json:"passed"`
	Score float64 `json:"score"`
}
