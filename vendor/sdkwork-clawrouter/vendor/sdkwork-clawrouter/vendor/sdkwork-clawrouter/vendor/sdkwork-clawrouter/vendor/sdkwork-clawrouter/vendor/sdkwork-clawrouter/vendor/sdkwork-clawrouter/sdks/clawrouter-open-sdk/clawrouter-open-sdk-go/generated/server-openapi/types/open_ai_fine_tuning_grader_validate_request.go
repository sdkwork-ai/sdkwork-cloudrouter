package types

// OpenAI-compatible request to validate a fine-tuning grader definition.
type OpenAiFineTuningGraderValidateRequest struct {
	Grader ProviderJsonValue `json:"grader"`
}
