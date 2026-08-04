package types

// Test connection create result schema exposed by Cloud Router.
type TestConnectionCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
