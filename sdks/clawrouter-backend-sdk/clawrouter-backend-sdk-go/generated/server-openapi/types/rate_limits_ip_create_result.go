package types

// Rate limits ip create result schema exposed by Claw Router.
type RateLimitsIpCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
