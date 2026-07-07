package types

// Rate limits api keys create result schema exposed by Claw Router.
type RateLimitsApiKeysCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
