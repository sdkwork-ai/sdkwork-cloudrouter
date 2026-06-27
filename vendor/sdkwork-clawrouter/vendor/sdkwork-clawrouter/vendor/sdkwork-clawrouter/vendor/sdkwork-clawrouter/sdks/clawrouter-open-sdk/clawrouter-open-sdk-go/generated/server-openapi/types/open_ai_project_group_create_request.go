package types

// OpenAI-compatible request to add a group to a project.
type OpenAiProjectGroupCreateRequest struct {
	GroupId string `json:"group_id"`
}
