package types

// Invocations retrieve result schema exposed by Claw Router.
type InvocationsRetrieveResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
