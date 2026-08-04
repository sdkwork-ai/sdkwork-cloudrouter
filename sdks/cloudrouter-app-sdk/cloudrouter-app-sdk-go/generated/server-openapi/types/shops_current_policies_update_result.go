package types

// Shops current policies update result schema exposed by Cloud Router.
type ShopsCurrentPoliciesUpdateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
