package types

// Firewalls rules list result schema exposed by Claw Router.
type FirewallsRulesListResult struct {
	Code string `json:"code"`
	Data AdminFirewallRulesResponse `json:"data"`
	Msg string `json:"msg"`
}
