package types

// OpenAI-compatible request to update a project user.
type OpenAiProjectUserUpdateRequest struct {
	Role string `json:"role"`
}
