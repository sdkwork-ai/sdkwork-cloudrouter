package types

// OpenAI-compatible realtime client secret bootstrap response.
type OpenAiRealtimeClientSecret struct {
	ClientSecret OpenAiRealtimeClientSecretValue `json:"client_secret"`
	Session ProviderJsonValue `json:"session"`
}
