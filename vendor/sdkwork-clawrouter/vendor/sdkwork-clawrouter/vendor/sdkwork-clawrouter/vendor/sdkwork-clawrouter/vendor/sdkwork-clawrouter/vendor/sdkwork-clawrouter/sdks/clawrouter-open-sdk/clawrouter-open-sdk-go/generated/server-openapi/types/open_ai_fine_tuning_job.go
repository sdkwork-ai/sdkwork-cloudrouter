package types

// OpenAI-compatible fine-tuning job object.
type OpenAiFineTuningJob struct {
	CreatedAt int `json:"created_at"`
	Error ProviderJsonValue `json:"error"`
	FineTunedModel string `json:"fine_tuned_model"`
	FinishedAt int `json:"finished_at"`
	Hyperparameters ProviderJsonValue `json:"hyperparameters"`
	Id string `json:"id"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Model string `json:"model"`
	Object string `json:"object"`
	OrganizationId string `json:"organization_id"`
	ResultFiles []string `json:"result_files"`
	Status string `json:"status"`
	TrainedTokens int `json:"trained_tokens"`
	TrainingFile string `json:"training_file"`
	ValidationFile string `json:"validation_file"`
}
