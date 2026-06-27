package types

// Runtime event create request schema exposed by Claw Router.
type RuntimeEventCreateRequest struct {
	EventSource string `json:"eventSource"`
	EventType string `json:"eventType"`
	Metadata map[string]JsonValue `json:"metadata"`
	PayloadJson map[string]JsonValue `json:"payloadJson"`
	TextDelta string `json:"textDelta"`
}
