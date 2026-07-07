package types

// Invocations submit result schema exposed by Claw Router.
type InvocationsSubmitResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
