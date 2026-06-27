package types

// OpenAI-compatible request to create a realtime client secret.
type OpenAiRealtimeClientSecretCreateRequest struct {
	Instructions string `json:"instructions"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Modalities []string `json:"modalities"`
	Model string `json:"model"`
	Voice string `json:"voice"`
}
