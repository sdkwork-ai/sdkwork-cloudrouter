package types

// OpenAI-compatible request to refer or transfer a realtime call.
type OpenAiRealtimeCallReferRequest struct {
	TargetUri string `json:"target_uri"`
}
