package types

// Volcengine Ark volcengine content generation task schema exposed by Claw Router vendor routing.
type VolcengineContentGenerationTask struct {
	Content []VolcengineContentPart `json:"content"`
	CreatedAt string `json:"created_at"`
	Error ProviderTaskError `json:"error"`
	Id string `json:"id"`
	Model string `json:"model"`
	Prompt string `json:"prompt"`
	Result ProviderTaskResult `json:"result"`
	State string `json:"state"`
	Status string `json:"status"`
	TaskId string `json:"task_id"`
	UpdatedAt string `json:"updated_at"`
	Videos []ProviderGeneratedMedia `json:"videos"`
}
