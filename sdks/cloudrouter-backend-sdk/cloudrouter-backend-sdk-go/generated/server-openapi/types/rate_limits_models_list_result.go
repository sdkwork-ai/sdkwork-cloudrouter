package types

// Rate limits models list result schema exposed by Cloud Router.
type RateLimitsModelsListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
