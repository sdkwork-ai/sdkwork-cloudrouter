package types

// Messaging suppression create request schema exposed by Claw Router.
type MessagingSuppressionCreateRequest struct {
	Channel string `json:"channel"`
	EndsAt string `json:"endsAt"`
	Note string `json:"note"`
	ReasonCode string `json:"reasonCode"`
	ScopeId string `json:"scopeId"`
	ScopeType string `json:"scopeType"`
	Source string `json:"source"`
	StartsAt string `json:"startsAt"`
	TargetHash string `json:"targetHash"`
	TargetMasked string `json:"targetMasked"`
}
