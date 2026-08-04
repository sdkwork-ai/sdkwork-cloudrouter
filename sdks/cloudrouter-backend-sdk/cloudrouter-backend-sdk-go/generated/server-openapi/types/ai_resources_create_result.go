package types

// Ai resources create result schema exposed by Cloud Router.
type AiResourcesCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
