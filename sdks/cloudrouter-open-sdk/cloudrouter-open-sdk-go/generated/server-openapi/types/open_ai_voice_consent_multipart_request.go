package types

// OpenAI-compatible open ai voice consent multipart request schema exposed by Cloud Router.
type OpenAiVoiceConsentMultipartRequest struct {
	File []byte `json:"file"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Name string `json:"name"`
}
