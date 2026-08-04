package types

// Invocations submit result schema exposed by Cloud Router.
type InvocationsSubmitResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
