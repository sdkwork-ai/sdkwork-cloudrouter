package types

// OpenAI-compatible request to create or start a realtime call.
type OpenAiRealtimeCallCreateRequest struct {
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Sdp string `json:"sdp"`
	Session ProviderJsonValue `json:"session"`
}
