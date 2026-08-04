package types

// Health check create result schema exposed by Cloud Router.
type HealthCheckCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
