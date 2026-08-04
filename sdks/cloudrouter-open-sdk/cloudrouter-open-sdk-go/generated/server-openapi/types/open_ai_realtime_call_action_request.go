package types

// OpenAI-compatible request for a realtime call action.
type OpenAiRealtimeCallActionRequest struct {
	Metadata map[string]ProviderJsonValue `json:"metadata"`
}
