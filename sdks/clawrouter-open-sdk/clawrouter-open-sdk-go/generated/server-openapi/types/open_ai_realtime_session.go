package types

// OpenAI-compatible realtime session object.
type OpenAiRealtimeSession struct {
	ClientSecret OpenAiRealtimeClientSecretValue `json:"client_secret"`
	Id string `json:"id"`
	Instructions string `json:"instructions"`
	Modalities []string `json:"modalities"`
	Model string `json:"model"`
	Object string `json:"object"`
	Voice string `json:"voice"`
}
