package types

// Invocation events create result schema exposed by Cloud Router.
type InvocationEventsCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
