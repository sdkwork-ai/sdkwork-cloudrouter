package types

// OpenAI-compatible voice consent object.
type OpenAiVoiceConsent struct {
	ConsentDocument ProviderJsonValue `json:"consent_document"`
	CreatedAt int `json:"created_at"`
	Id string `json:"id"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Name string `json:"name"`
	Object string `json:"object"`
	Status string `json:"status"`
}
