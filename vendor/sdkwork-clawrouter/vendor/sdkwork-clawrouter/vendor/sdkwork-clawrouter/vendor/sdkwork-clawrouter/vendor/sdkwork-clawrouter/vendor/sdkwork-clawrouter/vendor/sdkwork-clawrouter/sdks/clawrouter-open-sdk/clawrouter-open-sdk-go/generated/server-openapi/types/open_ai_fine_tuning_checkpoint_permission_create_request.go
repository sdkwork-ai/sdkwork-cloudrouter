package types

// OpenAI-compatible request to create a fine-tuning checkpoint permission.
type OpenAiFineTuningCheckpointPermissionCreateRequest struct {
	ProjectId string `json:"project_id"`
}
