package types

// OpenAI-compatible request to update a project.
type OpenAiProjectUpdateRequest struct {
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Name string `json:"name"`
}
