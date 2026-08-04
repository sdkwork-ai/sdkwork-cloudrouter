package types

// OpenAI-compatible realtime translation session object.
type OpenAiRealtimeTranslationSession struct {
	ClientSecret OpenAiRealtimeClientSecretValue `json:"client_secret"`
	Id string `json:"id"`
	Object string `json:"object"`
	SourceLanguage string `json:"source_language"`
	TargetLanguage string `json:"target_language"`
}
