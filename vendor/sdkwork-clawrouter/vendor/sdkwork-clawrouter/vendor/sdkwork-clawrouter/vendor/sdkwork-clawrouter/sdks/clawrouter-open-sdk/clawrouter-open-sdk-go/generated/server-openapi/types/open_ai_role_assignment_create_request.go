package types

// OpenAI-compatible request to create a role assignment.
type OpenAiRoleAssignmentCreateRequest struct {
	RoleId string `json:"role_id"`
}
