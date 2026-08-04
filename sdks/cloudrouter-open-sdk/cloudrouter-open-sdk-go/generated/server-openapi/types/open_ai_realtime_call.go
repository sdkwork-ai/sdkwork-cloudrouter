package types

// OpenAI-compatible realtime call object.
type OpenAiRealtimeCall struct {
	CreatedAt int `json:"created_at"`
	Id string `json:"id"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Object string `json:"object"`
	Sdp string `json:"sdp"`
	Session ProviderJsonValue `json:"session"`
	Status string `json:"status"`
}
