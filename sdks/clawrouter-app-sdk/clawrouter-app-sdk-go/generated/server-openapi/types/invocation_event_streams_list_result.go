package types

// Invocation event streams list result schema exposed by Claw Router.
type InvocationEventStreamsListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
