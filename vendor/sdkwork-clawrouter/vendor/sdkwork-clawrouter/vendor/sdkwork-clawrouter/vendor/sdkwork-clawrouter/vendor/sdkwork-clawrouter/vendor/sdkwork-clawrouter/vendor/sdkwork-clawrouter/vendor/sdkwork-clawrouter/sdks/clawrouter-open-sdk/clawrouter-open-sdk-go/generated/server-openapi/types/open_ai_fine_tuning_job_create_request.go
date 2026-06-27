package types

// OpenAI-compatible request to create a fine-tuning job.
type OpenAiFineTuningJobCreateRequest struct {
	Hyperparameters ProviderJsonValue `json:"hyperparameters"`
	Integrations []ProviderJsonValue `json:"integrations"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Model string `json:"model"`
	Seed int `json:"seed"`
	Suffix string `json:"suffix"`
	TrainingFile string `json:"training_file"`
	ValidationFile string `json:"validation_file"`
}
