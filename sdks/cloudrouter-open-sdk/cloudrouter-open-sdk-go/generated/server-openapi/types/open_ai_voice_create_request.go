package types

// OpenAI-compatible request to create a voice.
type OpenAiVoiceCreateRequest struct {
	Description string `json:"description"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Name string `json:"name"`
}
