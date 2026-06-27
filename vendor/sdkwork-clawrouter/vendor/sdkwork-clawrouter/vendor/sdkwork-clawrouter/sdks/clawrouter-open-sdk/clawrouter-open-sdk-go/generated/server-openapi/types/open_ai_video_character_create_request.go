package types

// OpenAI-compatible request to create a reusable video character.
type OpenAiVideoCharacterCreateRequest struct {
	Description string `json:"description"`
	Image ProviderJsonValue `json:"image"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Name string `json:"name"`
}
