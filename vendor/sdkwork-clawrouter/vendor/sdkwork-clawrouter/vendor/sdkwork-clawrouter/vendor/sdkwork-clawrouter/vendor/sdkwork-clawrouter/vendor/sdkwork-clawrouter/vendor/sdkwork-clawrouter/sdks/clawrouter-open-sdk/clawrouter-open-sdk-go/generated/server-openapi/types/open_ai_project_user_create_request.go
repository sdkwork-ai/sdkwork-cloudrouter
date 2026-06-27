package types

// OpenAI-compatible request to add a user to a project.
type OpenAiProjectUserCreateRequest struct {
	Role string `json:"role"`
	UserId string `json:"user_id"`
}
