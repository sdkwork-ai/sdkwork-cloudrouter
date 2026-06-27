package types

// Admin firewall rule create request schema exposed by Claw Router.
type AdminFirewallRuleCreateRequest struct {
	Reason string `json:"reason"`
	Type string `json:"type"`
	Value string `json:"value"`
}
