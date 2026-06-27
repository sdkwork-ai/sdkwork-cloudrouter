package types

// OpenAI-compatible fine-tuning job checkpoint object.
type OpenAiFineTuningJobCheckpoint struct {
	CreatedAt int `json:"created_at"`
	FineTunedModelCheckpoint string `json:"fine_tuned_model_checkpoint"`
	FineTuningJobId string `json:"fine_tuning_job_id"`
	Id string `json:"id"`
	Metrics ProviderJsonValue `json:"metrics"`
	Object string `json:"object"`
	StepNumber int `json:"step_number"`
}
