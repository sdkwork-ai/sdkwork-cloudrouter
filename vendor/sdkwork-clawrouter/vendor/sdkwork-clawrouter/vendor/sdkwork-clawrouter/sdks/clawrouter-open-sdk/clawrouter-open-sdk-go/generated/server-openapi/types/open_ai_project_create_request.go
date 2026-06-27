package types

// OpenAI-compatible request to create a project.
type OpenAiProjectCreateRequest struct {
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Name string `json:"name"`
}
