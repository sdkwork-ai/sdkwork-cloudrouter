package types

// OpenAI-compatible fine-tuning grader validation result.
type OpenAiFineTuningGraderValidationResult struct {
	Errors []ProviderJsonValue `json:"errors"`
	Valid bool `json:"valid"`
	Warnings []ProviderJsonValue `json:"warnings"`
}
