package types

// Firewalls rules create result schema exposed by Claw Router.
type FirewallsRulesCreateResult struct {
	Code string `json:"code"`
	Data AdminFirewallMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
