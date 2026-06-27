package types

// Admin firewall rules response schema exposed by Claw Router.
type AdminFirewallRulesResponse struct {
	Items []AdminFirewallItem `json:"items"`
}
