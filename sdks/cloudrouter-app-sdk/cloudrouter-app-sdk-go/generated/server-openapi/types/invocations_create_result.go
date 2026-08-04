package types

// Invocations create result schema exposed by Cloud Router.
type InvocationsCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
