package types

// Ai resources list result schema exposed by Claw Router.
type AiResourcesListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
