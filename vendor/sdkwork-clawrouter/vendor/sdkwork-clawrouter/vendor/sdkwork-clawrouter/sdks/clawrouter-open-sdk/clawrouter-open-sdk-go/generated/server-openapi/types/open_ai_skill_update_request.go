package types

// OpenAI-compatible request to update a skill.
type OpenAiSkillUpdateRequest struct {
	Description string `json:"description"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Name string `json:"name"`
}
