package types

// Rate limits models create result schema exposed by Claw Router.
type RateLimitsModelsCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
