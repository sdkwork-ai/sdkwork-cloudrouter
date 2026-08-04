package types

// Ephemeral realtime client secret value.
type OpenAiRealtimeClientSecretValue struct {
	ExpiresAt int `json:"expires_at"`
	Value string `json:"value"`
}
