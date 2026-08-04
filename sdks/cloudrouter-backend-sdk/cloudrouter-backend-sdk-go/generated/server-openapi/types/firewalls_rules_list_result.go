package types

// Firewalls rules list result schema exposed by Cloud Router.
type FirewallsRulesListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
