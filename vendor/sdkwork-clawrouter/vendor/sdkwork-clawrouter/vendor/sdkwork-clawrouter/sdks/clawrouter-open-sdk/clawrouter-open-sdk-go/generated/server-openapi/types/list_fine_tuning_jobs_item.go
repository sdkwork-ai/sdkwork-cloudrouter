package types

// Item module returned inside the listFineTuningJobs list response.
type ListFineTuningJobsItem struct {
	Created int `json:"created"`
	CreatedAt int `json:"created_at"`
	FineTunedModel string `json:"fine_tuned_model"`
	Id string `json:"id"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Model string `json:"model"`
	Object string `json:"object"`
	ResultFiles []string `json:"result_files"`
	Status string `json:"status"`
	TrainingFile string `json:"training_file"`
}
