package types

// OpenAI-compatible request to reject an inbound realtime call.
type OpenAiRealtimeCallRejectRequest struct {
	StatusCode int `json:"status_code"`
}
