package types

// OpenAI-compatible request to create a role.
type OpenAiRoleCreateRequest struct {
	Description string `json:"description"`
	Name string `json:"name"`
	Permissions []string `json:"permissions"`
}
