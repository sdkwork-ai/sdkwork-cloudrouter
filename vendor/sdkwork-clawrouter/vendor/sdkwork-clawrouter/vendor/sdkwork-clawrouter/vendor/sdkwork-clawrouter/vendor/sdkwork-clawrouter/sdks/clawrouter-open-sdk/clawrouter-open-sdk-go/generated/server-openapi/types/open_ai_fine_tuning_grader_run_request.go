package types

// OpenAI-compatible request to run a fine-tuning grader against sample input.
type OpenAiFineTuningGraderRunRequest struct {
	Grader ProviderJsonValue `json:"grader"`
	Input ProviderJsonValue `json:"input"`
	ModelSample string `json:"model_sample"`
	ReferenceAnswer string `json:"reference_answer"`
}
