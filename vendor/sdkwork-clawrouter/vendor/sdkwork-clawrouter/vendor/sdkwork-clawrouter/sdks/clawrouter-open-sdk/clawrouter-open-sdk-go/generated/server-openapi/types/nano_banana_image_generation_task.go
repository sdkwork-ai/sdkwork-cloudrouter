package types

// Nano Banana compatible nano banana image generation task schema exposed by Claw Router vendor routing.
type NanoBananaImageGenerationTask struct {
	CreatedAt string `json:"created_at"`
	Error ProviderTaskError `json:"error"`
	Id string `json:"id"`
	Images []ProviderGeneratedMedia `json:"images"`
	Model string `json:"model"`
	Prompt string `json:"prompt"`
	State string `json:"state"`
	Status string `json:"status"`
	TaskId string `json:"task_id"`
	UpdatedAt string `json:"updated_at"`
}
