package types

// OpenAI-compatible request to update a role.
type OpenAiRoleUpdateRequest struct {
	Description string `json:"description"`
	Name string `json:"name"`
	Permissions []string `json:"permissions"`
}
