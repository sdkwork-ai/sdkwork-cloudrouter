package types

// OpenAI-compatible request to create a realtime translation session.
type OpenAiRealtimeTranslationSessionCreateRequest struct {
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Model string `json:"model"`
	SourceLanguage string `json:"source_language"`
	TargetLanguage string `json:"target_language"`
}
