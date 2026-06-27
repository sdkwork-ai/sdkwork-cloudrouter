package types

// OpenAI-compatible open ai realtime call multipart request schema exposed by Claw Router.
type OpenAiRealtimeCallMultipartRequest struct {
	Sdp string `json:"sdp"`
	Session string `json:"session"`
}
