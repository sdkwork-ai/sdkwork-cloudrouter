package types

// Rate limits api keys list result schema exposed by Claw Router.
type RateLimitsApiKeysListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
