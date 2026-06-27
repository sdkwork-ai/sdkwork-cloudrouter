package types

// OpenAI-compatible request to create a voice consent.
type OpenAiVoiceConsentCreateRequest struct {
	ConsentDocument ProviderJsonValue `json:"consent_document"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Name string `json:"name"`
}
