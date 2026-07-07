package types

// Rate limits ip list result schema exposed by Claw Router.
type RateLimitsIpListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
