package types

// Shops current policies list result schema exposed by Cloud Router.
type ShopsCurrentPoliciesListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
