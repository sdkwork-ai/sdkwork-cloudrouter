package types

// OpenAI-compatible paginated list of fine-tuning checkpoint permissions.
type OpenAiFineTuningCheckpointPermissionList struct {
	Data []OpenAiFineTuningCheckpointPermission `json:"data"`
	FirstId string `json:"first_id"`
	HasMore bool `json:"has_more"`
	LastId string `json:"last_id"`
	Object string `json:"object"`
}
