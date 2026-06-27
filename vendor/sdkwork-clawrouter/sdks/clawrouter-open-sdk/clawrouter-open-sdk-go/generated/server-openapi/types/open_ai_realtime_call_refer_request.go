package types

// OpenAI-compatible request to refer or transfer a realtime call.
type OpenAiRealtimeCallReferRequest struct {
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Target string `json:"target"`
}
