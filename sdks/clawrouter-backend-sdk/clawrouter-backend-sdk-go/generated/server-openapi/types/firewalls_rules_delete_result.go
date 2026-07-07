package types

// Firewalls rules delete result schema exposed by Claw Router.
type FirewallsRulesDeleteResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
