package types

// Firewalls rules create result schema exposed by Claw Router.
type FirewallsRulesCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
