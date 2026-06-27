package types

// Runtime event item schema exposed by Claw Router.
type RuntimeEventItem struct {
	CreatedAt string `json:"createdAt"`
	EventNo string `json:"eventNo"`
	EventSource string `json:"eventSource"`
	EventType string `json:"eventType"`
	Id string `json:"id"`
	InvocationId string `json:"invocationId"`
	PayloadJson map[string]JsonValue `json:"payloadJson"`
	TextDelta string `json:"textDelta"`
}
