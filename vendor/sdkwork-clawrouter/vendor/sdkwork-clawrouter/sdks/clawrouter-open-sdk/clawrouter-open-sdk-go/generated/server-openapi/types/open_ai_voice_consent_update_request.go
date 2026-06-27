package types

// OpenAI-compatible request to update a voice consent.
type OpenAiVoiceConsentUpdateRequest struct {
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Name string `json:"name"`
}
