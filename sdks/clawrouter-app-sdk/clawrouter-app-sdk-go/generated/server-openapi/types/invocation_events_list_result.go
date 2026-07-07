package types

// Invocation events list result schema exposed by Claw Router.
type InvocationEventsListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
