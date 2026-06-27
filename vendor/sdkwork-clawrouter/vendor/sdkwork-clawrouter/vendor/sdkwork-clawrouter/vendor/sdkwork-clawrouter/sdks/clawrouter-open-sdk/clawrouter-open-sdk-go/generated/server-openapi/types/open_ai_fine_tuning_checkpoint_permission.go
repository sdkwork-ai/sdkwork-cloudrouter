package types

// OpenAI-compatible fine-tuning checkpoint permission object.
type OpenAiFineTuningCheckpointPermission struct {
	CreatedAt int `json:"created_at"`
	Id string `json:"id"`
	Object string `json:"object"`
	ProjectId string `json:"project_id"`
}
