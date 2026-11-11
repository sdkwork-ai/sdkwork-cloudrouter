package types

// OpenAI-compatible request to create an ephemeral realtime client secret (`POST /v1/realtime/client_secrets`).
type OpenAiRealtimeClientSecretCreateRequest struct {
	ExpiresAfter map[string]ProviderJsonValue `json:"expires_after"`
	Session map[string]ProviderJsonValue `json:"session"`
}
