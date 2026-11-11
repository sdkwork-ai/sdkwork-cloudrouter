package types

// OpenAI-compatible request to update a voice consent.
type OpenAiVoiceConsentUpdateRequest struct {
	Name string `json:"name"`
}
