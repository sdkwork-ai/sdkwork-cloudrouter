package types

// OpenAI-compatible request to create a project service account.
type OpenAiProjectServiceAccountCreateRequest struct {
	Name string `json:"name"`
	Role string `json:"role"`
}
